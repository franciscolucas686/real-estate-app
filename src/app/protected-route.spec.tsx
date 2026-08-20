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
 * The `ProtectedRoute` specs are characterisation. What they lock is the consequence of
 * `getMe` treating a 401 as the **answer** `null` rather than as an error: `['me']` now
 * always carries data, so `isLoading` is true only on the very first fetch, and a session
 * known to be absent redirects at once instead of holding a loader through a background
 * refetch. That is the point — the guard has a definitive answer and should act on it.
 *
 * This used to read the opposite way, and for a real reason at the time: a data-less query
 * that starts fetching is reset to `status: 'pending'` with its error cleared, so the
 * error model made the guard wait. Modelling "anonymous" as an error is exactly what kept
 * `/auth/me` permanently stale and refetching, so it went; the guarantee that login does
 * not race the guard now comes from `useLogin` awaiting its own invalidation, which the
 * spec at the bottom of this file pins.
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

/**
 * Drives `['me']` into the state an anonymous visitor leaves behind: **success**, carrying
 * `null`. The assertions are the contract of `getMe` — a 401 must arrive as data, or the query
 * goes back to being permanently stale and `/auth/me` starts repeating on every focus.
 */
async function seedAnonymousSession(client: QueryClient) {
  meFails();
  await client.fetchQuery({ queryKey: ['me'], queryFn: getMe });
  expect(client.getQueryState(['me'])?.status).toBe('success');
  expect(client.getQueryData(['me'])).toBeNull();
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

  it('redirects at once on a known-absent session, without waiting out a background refetch', async () => {
    const client = makeClient();
    await seedAnonymousSession(client);

    // A refetch is pending and will eventually answer with a user, but the cache already
    // holds a definitive `null`. Holding a loader over a known answer is what the old error
    // model did; the honest response is the redirect. Nothing reaches this window through
    // login, because `useLogin` keeps its mutation pending until the refetch has landed —
    // the spec at the bottom of this file is what guarantees that.
    meSucceedsSlowly();
    renderGuarded(client);

    expect(await screen.findByText('Formulário de login')).toBeInTheDocument();
    expect(screen.queryByText('Painel')).not.toBeInTheDocument();
  });

  it('still redirects when the session is genuinely absent', async () => {
    const client = makeClient();
    await seedAnonymousSession(client);

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
    await seedAnonymousSession(client);
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
