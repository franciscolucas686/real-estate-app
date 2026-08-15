import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { PageWrapper } from '@/layout/page-wrapper';
import { SiteShell } from '@/layout/site-shell';
import { ConsoleShell } from '@/layout/console-shell';
import { ProtectedRoute } from '@/app/protected-route';
import { ToastProvider } from '@/ui/toast';
import { PageLoading } from '@/ui/page-loading';
import { SplashScreen } from '@/ui/splash-screen';
import { APP_ROUTES, NOT_FOUND_ROUTE, resolveRoute, type AppRoute } from '@/app/routes';
import { useSiteNavItems } from '@/app/use-site-nav-items';

/** Wraps a route's element in its guard and page wrapper, per its own config. */
function renderElement(route: AppRoute): ReactNode {
  const page = (
    <PageWrapper noScroll={route.noScroll} {...route.motion}>
      {route.element}
    </PageWrapper>
  );

  return route.guarded ? <ProtectedRoute>{page}</ProtectedRoute> : page;
}

/**
 * Restores the scroll position per route on back navigation.
 *
 * `useLayoutEffect` rather than `useEffect` so the correction lands before paint: routes
 * without their own enter animation would otherwise show one frame at the previous
 * page's scroll offset and then visibly jump.
 *
 * The "always start at the top" exception used to be a hardcoded `matchPath` for the
 * gallery inside this effect; it is now the route's own `resetScroll` flag.
 */
function useScrollRestoration(route: AppRoute) {
  const { pathname } = useLocation();
  const positions = useRef<Record<string, number>>({});

  useLayoutEffect(() => {
    if (route.resetScroll) {
      window.scrollTo(0, 0);
      return;
    }

    const saved = positions.current;
    window.scrollTo(0, saved[pathname] ?? 0);
    return () => {
      saved[pathname] = window.scrollY;
    };
  }, [pathname, route.resetScroll]);
}

function AppRoutes() {
  const location = useLocation();
  const route = resolveRoute(location.pathname);
  const siteNavItems = useSiteNavItems();

  useScrollRestoration(route);

  // One <Routes> for every shell, with the shell chosen *outside* the animated subtree.
  // Nesting the shells as layout routes would put them inside `key={location.pathname}`,
  // so the console sidebar would unmount and re-animate on every navigation within the
  // console — exactly the persistence it exists to provide.
  // Suspense por dentro da shell, e não em volta dela: as rotas pesadas são
  // `lazy` (ver routes.tsx), e um boundary externo faria a nav inteira sumir e
  // voltar a cada navegação para uma delas — piscando exatamente a chrome que as
  // duas shells existem para manter estável. Aqui só a área de conteúdo espera.
  const pages = (
    <AnimatePresence mode="popLayout">
      <Suspense fallback={<PageLoading />}>
        <Routes location={location} key={location.pathname}>
          {APP_ROUTES.map((r) => (
            <Route key={r.path} path={r.path} element={renderElement(r)} />
          ))}
          <Route path="*" element={renderElement(NOT_FOUND_ROUTE)} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );

  if (route.shell === 'console') {
    // Same `siteNavItems` the storefront gets: the bottom bar is the same bar with the same
    // entries in both shells, so signing in doesn't rearrange it. Free to compute — the hook
    // already ran above, unconditionally.
    return (
      <ConsoleShell items={siteNavItems} showMobileNav={!route.hideMobileNav}>
        {pages}
      </ConsoleShell>
    );
  }
  return (
    <SiteShell items={siteNavItems} showMobileNav={!route.hideMobileNav}>
      {pages}
    </SiteShell>
  );
}

const SESSION_KEY = '__splash_shown__';

function isAndroidStandalone() {
  try {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    return isStandalone && /android/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

function App() {
  const [splashVisible, setSplashVisible] = useState(() => {
    if (isAndroidStandalone()) return false;
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  });

  useEffect(() => {
    if (!splashVisible) return;
    const timer = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [splashVisible]);

  return (
    // reducedMotion="user" makes every motion component honour the OS setting:
    // transform and layout animations are dropped while opacity ones are kept, so page
    // transitions still read as a change of context without the movement. CSS-driven
    // animations are covered separately by the prefers-reduced-motion block in index.css.
    //
    // ToastProvider wraps the splash too: a mutation can fail while another flow's
    // success splash is still up, and the message must not be swallowed.
    <ToastProvider>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait">
          {splashVisible ? (
            <motion.div
              key="splash-container"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="fixed inset-0 z-(--z-splash) flex items-center justify-center bg-background"
            >
              <SplashScreen />
            </motion.div>
          ) : (
            <motion.div
              key="app-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <AppRoutes />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </ToastProvider>
  );
}

export default App;
