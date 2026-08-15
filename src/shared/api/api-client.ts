import type { ApiErrorResponse } from '@/shared/api/types';

const API_BASE = '/api';

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

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && pendingRefresh) return pendingRefresh;

  if (Date.now() - lastRefreshFailure < REFRESH_FAILURE_COOLDOWN_MS) return false;

  isRefreshing = true;
  pendingRefresh = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .then((ok) => {
      // Zerado no sucesso para não penalizar quem acabou de logar depois de uma
      // sessão anônima: o cooldown mede falhas seguidas, não o histórico da aba.
      lastRefreshFailure = ok ? 0 : Date.now();
      return ok;
    })
    .finally(() => {
      isRefreshing = false;
      pendingRefresh = null;
    });

  return pendingRefresh;
}

/** Chamado no login para que a primeira requisição autenticada não caia no cooldown. */
export function resetRefreshCooldown(): void {
  lastRefreshFailure = 0;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options);
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
