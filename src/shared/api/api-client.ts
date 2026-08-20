import type { ApiErrorResponse } from '@/shared/api/types';

/**
 * Base das chamadas de API.
 *
 * Os dois ambientes resolvem isto de formas diferentes, de propósito:
 *
 * - **Produção:** `VITE_API_BASE_URL` traz a raiz da API
 *   (`https://api.francinegestoraimobiliaria.com`) e o navegador fala direto com ela.
 *   Havia um rewrite de `/api` no `vercel.json` que encaminhava server-side; ele existia
 *   só porque `*.vercel.app` e `*.onrender.com` são *sites* diferentes e os cookies
 *   `sameSite: 'lax'` nunca sobreviveriam à travessia. Com apex e `api.` no mesmo domínio
 *   registrável isso deixou de ser verdade, e o proxy virava um salto extra em toda
 *   requisição — banda da Vercel inclusive nos uploads de foto.
 * - **Dev:** a variável fica vazia, o cliente usa o relativo `/api` e o proxy do Vite
 *   encaminha. Mantém tudo na mesma origem localmente, sem depender de CORS.
 *
 * **O `/api` é prefixo deste frontend, não do backend.** A API não tem prefixo global —
 * suas rotas vivem na raiz do host (`/properties`). Ele existe só para dar ao proxy do
 * Vite um padrão pelo qual casar, e o `rewrite:` de `vite.config.ts` o remove ao
 * encaminhar. Por isso `VITE_API_BASE_URL` **não** termina em `/api`.
 *
 * Deliberadamente **não** é a `VITE_API_URL`: aquela é o *host raiz* que o proxy do
 * Vite usa como alvo em `vite.config.ts`, e sobrecarregar um nome com dois
 * significados é exatamente o tipo de ambiguidade que já custou caro neste arquivo.
 * Deixando esta ausente em dev, o fluxo local segue idêntico.
 */
/*
 * `||`, não `??`, e a diferença é o caso que realmente acontece.
 *
 * O jeito de "desligar" a variável num arquivo `.env` é deixá-la vazia — é o que
 * `.env.production` faz com a `VITE_API_URL` ao lado. O Vite injeta `""`, que `??` não
 * considera ausente: a base virava string vazia e toda chamada saía como `/properties`,
 * na origem do app. Em produção o fallback SPA responde a isso com o `index.html`, ou
 * seja, 200 com HTML no lugar de JSON — a falha mais difícil de diagnosticar que existe
 * aqui, e a que os comentários do `.env.production` já descreviam como sendo `/api`.
 * Com `||`, vazia e ausente significam a mesma coisa, que é o que o resto do projeto
 * assume.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let isRefreshing = false;
let pendingRefresh: Promise<boolean> | null = null;
let lastRefreshFailure = 0;

/**
 * Quanto tempo uma falha de refresh vale como resposta. A dedupe por promessa
 * abaixo só funde chamadas *concorrentes*; sem esta janela, um visitante anônimo
 * gerava um POST /auth/refresh por 401 — e como toda página do site chama
 * `GET /auth/me` (o nav depende da sessão), isso somava vários por navegação,
 * contra um limite de 30/5min compartilhado por IP. O balde estourava e a vítima
 * era o operador logado: o refresh legítimo dele voltava 429, `apiFetch` lançava,
 * e o ProtectedRoute o mandava para o /login no meio do trabalho.
 */
const REFRESH_FAILURE_COOLDOWN_MS = 30_000;

/**
 * Rotas cujo 401 significa "credencial errada", nunca "access token expirado".
 *
 * Sem esta lista, uma senha digitada errada com sessão ainda válida no cookie jar
 * entrava em laço: `/auth/login` responde 401, o refresh (que continua válido) devolve
 * 200, a requisição é repetida, o login responde 401 de novo — e como o cooldown é
 * zerado a cada refresh bem-sucedido, nada interrompia o ciclo até o teto de 30/5min
 * de `POST /auth/refresh` estourar. Ou seja: um erro de digitação queimava o balde de
 * refresh do IP inteiro por cinco minutos, derrubando a sessão de quem estivesse
 * trabalhando. É a mesma falha que o cooldown foi criado para evitar, por outra porta.
 */
const CREDENTIAL_ROUTES = ['/auth/login', '/auth/register', '/auth/refresh'];

function isCredentialRoute(path: string): boolean {
  return CREDENTIAL_ROUTES.some((route) => path.startsWith(route));
}

async function runRefresh(): Promise<boolean> {
  if (Date.now() - lastRefreshFailure < REFRESH_FAILURE_COOLDOWN_MS) return false;

  const ok = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false);

  // Zerado no sucesso para não penalizar quem acabou de logar depois de uma
  // sessão anônima: o cooldown mede falhas seguidas, não o histórico da aba.
  lastRefreshFailure = ok ? 0 : Date.now();
  return ok;
}

/**
 * A dedupe por promessa cobre chamadas concorrentes **desta** aba. Entre abas ela não
 * ajuda: são contextos JS separados que dividem o mesmo cookie jar, expiram juntos e
 * disparam dois refresh com o mesmo token — o segundo chega depois da rotação do
 * primeiro e leva 401, deslogando quem tinha sessão válida.
 *
 * `navigator.locks` é travado por origem, então serializa as abas: a segunda espera,
 * e ao entrar encontra o cookie já renovado. `apiFetch` reaproveita isso retentando a
 * requisição original antes de pedir refresh de novo.
 */
async function refreshUnderLock(): Promise<boolean> {
  // Sem Web Locks (Safari antigo, jsdom) o comportamento é o de antes: só a dedupe
  // por aba. Nada quebra, a corrida entre abas apenas continua possível.
  if (typeof navigator === 'undefined' || !navigator.locks) return runRefresh();

  return navigator.locks.request('auth-refresh', () => runRefresh());
}

function refreshToken(): Promise<boolean> {
  if (isRefreshing && pendingRefresh) return pendingRefresh;

  isRefreshing = true;
  const inFlight = refreshUnderLock().finally(() => {
    isRefreshing = false;
    pendingRefresh = null;
  });
  pendingRefresh = inFlight;

  return inFlight;
}

/** Chamado no login para que a primeira requisição autenticada não caia no cooldown. */
export function resetRefreshCooldown(): void {
  lastRefreshFailure = 0;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  /** Interno: marca a chamada como sendo já a segunda tentativa. */
  retried = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Uma tentativa só, e nunca nas rotas de credencial. As duas guardas são o que
  // impede o laço descrito em CREDENTIAL_ROUTES — a recursão aqui não tinha teto.
  if (response.status === 401 && !retried && !isCredentialRoute(path)) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
  }

  if (!response.ok) {
    let errorPayload: ApiErrorResponse | null = null;
    try {
      errorPayload = (await response.json()) as ApiErrorResponse;
    } catch {
      errorPayload = {
        statusCode: response.status,
        error: 'RequestError',
        message: 'Falha na requisição',
      };
    }
    throw errorPayload;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
