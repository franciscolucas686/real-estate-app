import type { ReactNode } from 'react';
import { Navigate, matchRoutes } from 'react-router-dom';
import type { HTMLMotionProps } from 'motion/react';

import { Home } from '@/pages/home';
import { Properties } from '@/pages/properties';
import { Contact } from '@/pages/contact';
import { Profile } from '@/pages/profile';
import { PropertyDetails } from '@/pages/property-details';
import { Login } from '@/pages/login';
import { Dashboard } from '@/pages/dashboard';
import { Settings } from '@/pages/settings';
import { PropertyForm } from '@/pages/property-form';
import { GalleryManagement } from '@/pages/gallery-management';
import { NotFound } from '@/pages/not-found';

/**
 * Which chrome a route renders inside.
 *
 * - `site` — public storefront: top nav on desktop, bottom nav on mobile.
 * - `console` — authenticated operator surface: persistent sidebar.
 *
 * There was a third, `focused` — no chrome at all — which existed for the login screen and
 * nothing else. When login moved to `site` it had zero routes, and a shell kind that no
 * screen uses is a branch nobody exercises and a paragraph of documentation that quietly
 * stops being true. Reintroducing it is the two lines below plus one in `app.tsx`.
 */
export type ShellKind = 'site' | 'console';

export interface AppRoute {
  path: string;
  element: ReactNode;
  shell: ShellKind;
  /** Wrap in `ProtectedRoute`. */
  guarded?: boolean;
  /** Suppress the mobile bottom nav on a single-task screen, in either shell. */
  hideMobileNav?: boolean;
  /** Page transition, forwarded to `PageWrapper`. */
  motion?: HTMLMotionProps<'main'>;
  /** Lock the page to viewport height (avoids the mobile keyboard resizing the layout). */
  noScroll?: boolean;
  /** Always start at the top instead of restoring the previous scroll position. */
  resetScroll?: boolean;
}

/**
 * The route table, as data.
 *
 * Previously the routes lived as JSX in `app.tsx` while the decision of whether to show
 * the bottom nav lived in a separate `ROUTES_WITHOUT_BOTTOM_NAV` array, and the
 * "always scroll to top" exception for the gallery was hardcoded inside the scroll-
 * restoration effect. Three places had to agree about one route. They now don't have to:
 * each route declares its own chrome and scroll behaviour, and `app.tsx` just renders it.
 */
export const APP_ROUTES: AppRoute[] = [
  // ── Public storefront ──────────────────────────────────────────────────────
  // `/` is a home, not the results grid. The app used to open on a wall of cards with no
  // context or proposition; the listing moved to `/imoveis`.
  { path: '/', element: <Home />, shell: 'site' },
  { path: '/imoveis', element: <Properties />, shell: 'site' },
  { path: '/contact', element: <Contact />, shell: 'site', noScroll: true },
  { path: '/profile', element: <Profile />, shell: 'site' },

  // Keeps links and bookmarks to the retired full-page filters route working. The filter
  // form is now a responsive modal on the listing itself, so there is nowhere else to go —
  // and the query string carries over, so a shared filtered link still lands filtered.
  { path: '/search/filters', element: <Navigate to="/imoveis" replace />, shell: 'site' },

  {
    path: '/properties/:id',
    element: <PropertyDetails />,
    shell: 'site',
    hideMobileNav: true,
    // Slides in from the right, reading as "deeper into" the results.
    motion: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
      transition: { type: 'spring', damping: 30, stiffness: 300 },
    },
  },

  // ── Authentication ─────────────────────────────────────────────────────────
  // Storefront chrome, not a bare screen: signing in is reached *from* the nav — the third
  // site item is literally "Entrar" → here — so removing the nav on arrival stranded the
  // visitor with no way back to the listing except the browser's own back button.
  { path: '/login', element: <Login />, shell: 'site', noScroll: true },

  // ── Console ────────────────────────────────────────────────────────────────
  { path: '/dashboard', element: <Dashboard />, shell: 'console', guarded: true },
  { path: '/settings', element: <Settings />, shell: 'console', guarded: true },
  {
    path: '/properties/new',
    element: <PropertyForm />,
    shell: 'console',
    guarded: true,
    // The wizard has its own fixed "Continuar" bar at the bottom — same position as the
    // console's mobile nav, and without this the nav's higher z-index paints over it.
    hideMobileNav: true,
  },
  {
    path: '/properties/:id/edit',
    element: <PropertyForm />,
    shell: 'console',
    guarded: true,
    hideMobileNav: true,
  },
  {
    path: '/properties/:id/gallery',
    element: <GalleryManagement />,
    shell: 'console',
    guarded: true,
    // Same reason as the wizard: this page owns the bottom of a phone's viewport — its own
    // "Concluir" bar, and the room manager's selection bar. The gallery's bar is `fixed
    // bottom-0` and the console's nav is too, at `z-(--z-fixed)` and rendered *after*
    // `{children}` — so the nav painted over it and the button was in the DOM but invisible
    // and untouchable on mobile.
    hideMobileNav: true,
    // The gallery is a workspace, not a document: reopening it mid-scroll from a
    // previous session is disorienting.
    resetScroll: true,
  },
];

/**
 * Catch-all. There was no `*` route before, so a typo'd or dead URL rendered the shell
 * with an empty content area — a broken-looking page with no way to tell what happened.
 */
export const NOT_FOUND_ROUTE: AppRoute = {
  path: '*',
  element: <NotFound />,
  shell: 'site',
};

const MATCHABLE = APP_ROUTES.map((route) => ({ path: route.path }));

/**
 * The route that matches `pathname`, or the catch-all.
 *
 * Uses `matchRoutes` rather than scanning the array with `matchPath`, because the two
 * rank candidates differently and only one of them agrees with the renderer. `/properties/new`
 * matches both `/properties/:id` and `/properties/new`; a linear scan picks whichever is
 * listed first, while `<Routes>` always prefers the static segment over the dynamic one.
 * Getting this wrong is silent and asymmetric: the *page* would be the wizard while the
 * *shell* around it was the public storefront.
 */
export function resolveRoute(pathname: string): AppRoute {
  const matches = matchRoutes(MATCHABLE, pathname);
  const matchedPath = matches?.at(-1)?.route.path;

  return APP_ROUTES.find((route) => route.path === matchedPath) ?? NOT_FOUND_ROUTE;
}
