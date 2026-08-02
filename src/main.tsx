import { StrictMode } from 'react';
import ReactDom from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from '@/app/app';
import { ErrorBoundary } from '@/ui/error-boundary';

// The browser's own native scroll restoration on back/forward navigation races
// against AppRoutes' own scroll restoration (App.tsx), which already restores
// the correct position in a useLayoutEffect before paint. Without this, the
// native restoration can flash the page at the top first, then jump once our
// effect corrects it. Disabling it leaves restoration entirely to our own logic.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const queryClient = new QueryClient();

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
