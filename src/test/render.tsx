import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { MemoryRouter, Route, Routes, parsePath } from 'react-router-dom';
import { ToastProvider } from '@/ui/toast';

// Fresh QueryClient per render call so tests don't share cache/state.
// retry: false keeps failed-request tests fast and deterministic.
//
// `path` is a route *pattern* (e.g. "/properties/:id/gallery") — pass it
// whenever the component under test reads useParams(); without a matched
// <Route>, react-router never populates params. Defaults to `route` itself,
// which is fine for components that don't use route params (e.g. Login).
// `state` is what `location.state` resolves to. The property detail's whole post-create
// flow keys off it — `context: 'post-create'` raises the "Finalizar imóvel" bar and
// `showSplash` the arrival splash — and with `initialEntries` taking a bare string there
// was no way to reach any of it from a spec.
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = route, state }: { route?: string; path?: string; state?: unknown } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    // ToastProvider mirrors app/app.tsx: the mutation hooks call useToast() so failures
    // are announced instead of swallowed, which makes it a hard requirement for any page
    // that writes. Rendering without it throws.
    //
    // `reducedMotion="always"`, not `"user"` like app.tsx: `"user"` defers to
    // `prefers-reduced-motion`, and jsdom has no real matchMedia — the stub in
    // src/test/setup.ts always reports `matches: false`, so `"user"` would be a
    // no-op here and specs would still pay real requestAnimationFrame-driven
    // animation time (splash, media viewer, page transitions). That's wasted
    // wall-clock a test never asserts on, and it's one of the things that
    // narrows this suite's margin against Vitest's testTimeout under load —
    // see the comment in vitest.config.ts.
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="always">
        <ToastProvider>
          {/* `parsePath` and not `{ pathname: route }`: half the call sites pass a route with a
              query string (`/imoveis?page=2`), and as a bare `pathname` that is taken
              literally — the search never reaches `useSearchParams`, which is where the
              filters live. */}
          <MemoryRouter initialEntries={[{ ...parsePath(route), state }]}>
            <Routes>
              <Route path={path} element={ui} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>,
  );
}
