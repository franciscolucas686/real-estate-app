import { apiFetch, resetRefreshCooldown } from '@/shared/api/api-client';
import type { LoginDto, RegisterDto, UserProfile } from '@/shared/api/types';

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

export async function getMe() {
  return apiFetch<UserProfile>('/auth/me');
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
