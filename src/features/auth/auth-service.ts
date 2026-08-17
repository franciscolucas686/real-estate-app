import { apiFetch, resetRefreshCooldown } from '@/shared/api/api-client';
import type { ApiErrorResponse, LoginDto, RegisterDto, UserProfile } from '@/shared/api/types';

export async function login(payload: LoginDto) {
  const result = await apiFetch<{ user: Pick<UserProfile, 'id' | 'email' | 'name'> }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  // Navegar anônimo deixa o cooldown de refresh armado (todo /auth/me devolve 401);
  // sem limpá-lo, um login logo em seguida herdaria essa janela e o primeiro refresh
  // da sessão nova seria descartado sem nem sair.
  resetRefreshCooldown();

  return result;
}

export async function register(payload: RegisterDto) {
  return apiFetch<{ user: Pick<UserProfile, 'id' | 'email' | 'name'> }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * `UserProfile | null`, e o `null` é uma **resposta**, não uma falha.
 *
 * Modelar "não está logado" como erro era o que fazia o `/auth/me` se repetir sem parar. No React
 * Query um erro não tem `data`, e `isStaleByTime` devolve `true` de saída quando `data` é
 * `undefined` — sem nem consultar o `staleTime`. Ou seja: para um visitante anônimo a query
 * ficava **permanentemente stale**, e com os defaults `refetchOnMount` e `refetchOnWindowFocus`
 * todo mount de observer e toda volta para a aba refaziam a chamada. O `staleTime: 60_000` de
 * `use-auth.ts` era código morto exatamente para quem ele deveria proteger.
 *
 * Com `null` — que é data *definida* — o `staleTime` passa a valer e a repetição acaba.
 *
 * Hoje o backend já responde 200 com `null` para quem não tem sessão nenhuma, então este `catch`
 * cobre o caso que sobra: cookie de refresh **expirado**, onde `/auth/me` responde 401 de
 * propósito (para o cliente tentar renovar) e a renovação falha. Sem ele, esse usuário cairia na
 * mesma tempestade de refetch.
 *
 * Só o 401 vira `null`. Um 500 ou erro de rede continua sendo erro — traduzi-los aqui faria uma
 * falha transitória do backend parecer logout e jogaria um operador logado no `/login`.
 */
export async function getMe(): Promise<UserProfile | null> {
  try {
    return await apiFetch<UserProfile | null>('/auth/me');
  } catch (error) {
    if ((error as ApiErrorResponse | null)?.statusCode === 401) return null;
    throw error;
  }
}

/** Encerra só este dispositivo. As outras sessões da conta seguem abertas. */
export async function logout() {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Encerra a sessão em todos os dispositivos, inclusive neste. É a ação a usar quando
 * se suspeita que uma sessão vazou — o logout comum só fecha a porta local.
 */
export async function logoutAll() {
  return apiFetch<{ message: string; count: number }>('/auth/logout-all', {
    method: 'POST',
  });
}
