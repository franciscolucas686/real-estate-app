import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, login, logout, logoutAll } from '@/features/auth/auth-service';
import type { LoginDto } from '@/shared/api/types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginDto) => login(payload),
    // The `return` is load-bearing: v5 keeps the mutation pending until a promise returned
    // from `onSuccess` settles, so `await mutateAsync(...)` resolves only once `['me']` has
    // actually refetched. Fire-and-forget instead resolved the caller while the session was
    // still unknown, which is why `login.tsx` needed a 900ms guess to cover the gap — and a
    // guess is either too short (the dashboard mounts and hangs on the guard's spinner) or
    // too long (everyone waits for the slowest case). Awaiting the refetch replaces the
    // guess with the actual answer. Pinned by `app/protected-route.spec.tsx`.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Igual ao `useLogout` do ponto de vista deste dispositivo — o cache é limpo do mesmo
 * jeito. A diferença está no servidor, que apaga todas as sessões da conta.
 */
export function useLogoutAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAll,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
