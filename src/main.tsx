import { StrictMode } from 'react';
import ReactDom from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from '@/app/app';
import type { ApiErrorResponse } from '@/shared/api/types';
import { ErrorBoundary } from '@/ui/error-boundary';

// The browser's own native scroll restoration on back/forward navigation races
// against AppRoutes' own scroll restoration (App.tsx), which already restores
// the correct position in a useLayoutEffect before paint. Without this, the
// native restoration can flash the page at the top first, then jump once our
// effect corrects it. Disabling it leaves restoration entirely to our own logic.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

/**
 * Um 4xx não melhora se for tentado de novo, e o padrão do React Query (3 retries)
 * transformava cada um deles em quatro requisições. Isso era caro em dois pontos
 * concretos: `usePropertyStatusCounts` na home pública e qualquer query que já
 * tivesse levado 429 — nos dois casos o retry só empurrava o rate limit mais fundo,
 * e no primeiro cada tentativa ainda arrastava junto um POST /auth/refresh.
 *
 * Erro de rede e 5xx continuam com os 3 retries: ali a repetição é justamente o que
 * resolve.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Via `unknown` porque o React Query tipa `error` como `Error`, enquanto
        // `apiFetch` lança o payload cru do backend — um objeto simples, não um Error.
        const status = (error as unknown as ApiErrorResponse | null)?.statusCode;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
    },
  },
});

ReactDom.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      Inside the providers rather than outside, so the fallback still has them if we ever
      want it to report; and wrapping <App /> rather than sitting inside it, so a throw in
      the shell or the router itself is caught too — those are exactly the failures that
      leave a blank page with nothing to read.
    */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
