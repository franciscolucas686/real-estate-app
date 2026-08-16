import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { ProtectedRoute } from '@/app/protected-route';
import { useLogin, useMe } from '@/features/auth/use-auth';
import { getMe } from '@/features/auth/auth-service';
import type { UserProfile } from '@/shared/api/types';

/**
 * The login → dashboard handoff had no coverage at all: `login.spec.tsx` stops at the
 * mutation and `dashboard.spec.tsx` renders `<Dashboard />` outside `ProtectedRoute`, so
 * nothing exercised the seam where a fresh session meets the guard.
 *
 * The `useLogin` spec at the bottom is the one that pins a fixed defect — the invalidation
 * was fire-and-forget, so `mutateAsync` resolved with `['me']` still empty and the caller
 * navigated into a guard that had no session yet.
 *
 * The `ProtectedRoute` specs are characterisation: the guard is already correct and these
 * lock it that way. Worth stating why, because the reasoning is not obvious from the code
 * — a data-less query that starts fetching is reset to `status: 'pending'` with its error
 * cleared (v5's `Query` reducer), so `isLoading` covers the refetch-after-401 window and
 * the guard shows its loader rather than reading the gap as "no session". Anyone tempted
 * to "fix" that by reaching for `isFetching`/`isError` will find these tests already
 * describe the behaviour.
 */

const USER: UserProfile = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin',
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const meFails = () =>
  server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })));

const meSucceedsSlowly = () =>
  server.use(
    http.get('/api/auth/me', async () => {
      await delay(50);
      return HttpResponse.json(USER);
    }),
  );

function renderGuarded(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <h1>Painel</h1>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<h1>Formulário de login</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Drives `['me']` into the errored state the anonymous 401 leaves behind. */
async function seedErroredSession(client: QueryClient) {
  meFails();
  await client.fetchQuery({ queryKey: ['me'], queryFn: getMe }).catch(() => undefined);
  expect(client.getQueryState(['me'])?.status).toBe('error');
}

describe('ProtectedRoute', () => {
  it('waits for the session instead of redirecting while /auth/me is in flight', async () => {
    meSucceedsSlowly();
    renderGuarded(makeClient());

    // The label is the live region's *content*, not an accessible name — `PageLoading`
    // announces through `role="status"` with a visually-hidden span.
    expect(await screen.findByRole('status')).toHaveTextContent('Verificando sua sessão…');

    expect(await screen.findByText('Painel')).toBeInTheDocument();
    expect(screen.queryByText('Formulário de login')).not.toBeInTheDocument();
  });

  it('does not bounce to /login while an already-errored session is refetching', async () => {
    const client = makeClient();
    await seedErroredSession(client);

    // The state right after a successful login: the cached session is still an error, and
    // the refetch that will replace it has not landed yet.
    meSucceedsSlowly();
    renderGuarded(client);

    expect(await screen.findByText('Painel')).toBeInTheDocument();
    expect(screen.queryByText('Formulário de login')).not.toBeInTheDocument();
  });

  it('still redirects when the session is genuinely absent', async () => {
    const client = makeClient();
    await seedErroredSession(client);

    // No refetch pending and no user: this is the case the guard exists for.
    client.setDefaultOptions({ queries: { retry: false, enabled: false } });
    renderGuarded(client);

    expect(await screen.findByText('Formulário de login')).toBeInTheDocument();
    expect(screen.queryByText('Painel')).not.toBeInTheDocument();
  });
});

/**
 * Harness mirroring the real login screen: a `useMe()` observer is already mounted (that
 * is `useSiteNavItems` in the app), and the submit handler awaits `mutateAsync` exactly as
 * `login.tsx` does before it starts the redirect timer.
 */
function LoginHarness() {
  const client = useQueryClient();
  const login = useLogin();
  useMe();
  const [sessionAtResolve, setSessionAtResolve] = useState('não submetido');

  async function submit() {
    await login.mutateAsync({ email: 'admin@example.com', password: 'secret123' });
    setSessionAtResolve(client.getQueryData(['me']) ? 'sessão conhecida' : 'sessão desconhecida');
  }

  return (
    <>
      <button type="button" onClick={() => void submit()}>
        Entrar
      </button>
      <p>{sessionAtResolve}</p>
    </>
  );
}

describe('useLogin', () => {
  it('keeps the mutation pending until the session query has refetched', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    await seedErroredSession(client);
    meSucceedsSlowly();

    render(
      <QueryClientProvider client={client}>
        <LoginHarness />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // Fire-and-forget invalidation resolved `mutateAsync` here with `['me']` still empty,
    // which is what let the caller navigate into a guard that had no session yet.
    expect(await screen.findByText('sessão conhecida')).toBeInTheDocument();
  });
});
