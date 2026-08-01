import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/ui/toast';

// Fresh QueryClient per render call so tests don't share cache/state.
// retry: false keeps failed-request tests fast and deterministic.
//
// `path` is a route *pattern* (e.g. "/properties/:id/gallery") — pass it
// whenever the component under test reads useParams(); without a matched
// <Route>, react-router never populates params. Defaults to `route` itself,
// which is fine for components that don't use route params (e.g. Login).
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = route }: { route?: string; path?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    // ToastProvider mirrors app/app.tsx: the mutation hooks call useToast() so failures
    // are announced instead of swallowed, which makes it a hard requirement for any page
    // that writes. Rendering without it throws.
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}
