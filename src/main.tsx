import { StrictMode } from 'react';
import ReactDom from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from '@/app/app';
import { hideMobileNavBar } from '@/shared/hide-mobile-nav-bar';

hideMobileNavBar();

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
