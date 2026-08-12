import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/cn';
import { SkipLink } from '@/layout/skip-link';
import { BottomNav, BottomNavItem, type NavItemDescriptor } from '@/layout/app-nav';

/**
 * Console paths that belong to `/dashboard` without sharing its prefix — the property
 * wizard and the gallery manager. Without them nothing in the sidebar is lit while the
 * operator is three screens deep in creating a listing.
 *
 * This is the last of what used to be a whole `CONSOLE_NAV` table. The sidebar now renders
 * the same entries as everything else, so the labels, icons and destinations are gone from
 * here; only the highlight rule is still the console's own business.
 */
const DASHBOARD_OWNS = ['/properties/new', '/properties/'];

/**
 * Left inset a full-viewport overlay needs so it stops short of the sidebar instead of covering
 * it. Mirrors the `<aside>`'s own `w-16 lg:w-56`, which is why it lives next to it: a copy in
 * the consuming page is how the bottom nav's height ended up encoded twice and correct neither
 * time. A `fixed` element with a z-index paints over the aside — which is `sticky` at
 * `z-index: auto`, so it creates no stacking context — regardless of DOM order, so opting out
 * of that is the caller's job.
 */
export const CONSOLE_SIDEBAR_INSET = 'md:left-16 lg:left-56';

/**
 * Plain function, not a hook: pathname is passed in, so it is safe to call inside .map().
 *
 * The sidebar's policy, and only the sidebar's — the bottom bar uses `BottomNavItem`'s own
 * prefix match. The difference is `/dashboard`, which has to stay lit across the wizard and
 * the gallery; every other entry is an ordinary prefix match, and `/` is compared exactly so
 * the storefront entry doesn't light up on every console route.
 */
function isActive(to: string, pathname: string): boolean {
  if (to === '/dashboard') {
    return pathname === to || DASHBOARD_OWNS.some((prefix) => pathname.startsWith(prefix));
  }
  return pathname === to || (to !== '/' && pathname.startsWith(to));
}

/**
 * Shell for the authenticated side of the product.
 *
 * The storefront and the console answer different questions — "do I like this one?"
 * versus "what do I need to deal with?" — so they get different chrome rather than one
 * shell with conditionals. Here that means a persistent sidebar: the operator moves
 * between sections repeatedly and should never lose their place to find the next one.
 *
 * **The sidebar is desktop-only.** A 64px rail costs 17% of a 375px phone, which the
 * dashboard's two-column grid cannot spare, so below `md` the same entries render as a
 * bottom bar instead. Same items, same active state, presentation chosen by width.
 */
export function ConsoleShell({
  children,
  items,
  showMobileNav = true,
}: {
  children: ReactNode;
  /**
   * The storefront's nav entries, same array `SiteShell` gets and from the same place —
   * rendered by *both* presentations here, the sidebar and the bottom bar.
   *
   * The console used to keep its own `CONSOLE_NAV` (Imóveis → `/dashboard`, Configurações,
   * Ver o site), so signing in replaced every label, icon and destination at once. Now the
   * navigation is the same before and after, with only the third entry going
   * "Entrar" → "Dashboard".
   *
   * They arrive as a prop because building them needs the session and `layout/` may not
   * import from `features/` — the lint zone rejects it.
   */
  items: NavItemDescriptor[];
  /** Suppress the mobile bottom nav — mirrors `SiteShell`'s prop of the same name, for a
   *  single-task console screen that already has its own fixed action bar at the bottom
   *  (the property wizard's "Continuar"). Both are `fixed bottom-0`; without this, the
   *  console's bar sits at a higher z-index and paints over the page's own, leaving its
   *  button in the DOM but invisible and untouchable. */
  showMobileNav?: boolean;
}) {
  const { pathname } = useLocation();

  return (
    <div data-slot="console-shell" className="flex min-h-dvh bg-background">
      <SkipLink />
      <aside
        aria-label="Seções do painel"
        className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col gap-1 bg-primary px-2 py-4 md:flex lg:w-56 lg:px-3"
      >
        {/* The brand goes Home, the same place the storefront's does. "Imóveis" below is the
            way back to the dashboard; a brand mark that led there instead made the console
            the only chrome with no one-click way out to the public site. */}
        <Link
          to="/"
          className="mb-4 flex items-center gap-2 rounded-xl px-2 py-2 text-primary-foreground transition-opacity md:hover:opacity-80"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-action text-sm font-bold">
            MI
          </span>
          <span className="hidden truncate text-sm font-semibold lg:inline">Minha Imobiliária</span>
        </Link>

        {/* Same entries as the bottom bar and as the storefront's top nav. `title` carries the
            label for the collapsed `w-16` rail below `lg`, where the text is hidden. */}
        <nav className="flex flex-col gap-1">
          {items.map(({ key, to, label, icon }) => {
            const active = isActive(to, pathname);
            return (
              <Link
                key={key}
                to={to}
                aria-current={active ? 'page' : undefined}
                title={label}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-primary-foreground/60 transition-colors md:hover:bg-white/10 md:hover:text-primary-foreground',
                  active && 'bg-action text-primary-foreground',
                )}
              >
                {icon}
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div id="conteudo" className="flex min-w-0 flex-1 flex-col">
        {children}
      </div>

      {/*
        Same bar as the storefront's — same component *and* same entries. It used to be a
        byte-for-byte copy of `BottomNav` + `BottomNavItem` living here, which meant the
        bar's height (78px plus the safe-area inset) was encoded in two places and true in
        neither: the dashboard reserved `pb-28` for it and clipped its own last row on a
        notched phone.

        It also used to render `CONSOLE_NAV`, so signing in swapped all three entries —
        different labels, different icons, and an "Imóveis" pointing somewhere else. On a
        phone that reads as the app replacing its own navigation. The two entries that leave
        are not lost: Configurações is in the dashboard header at every width, and "Ver o
        site" is redundant once the bar itself *is* the site.

        No `aria-label` override any more, for the same reason — these are not sections of
        the panel. The `<aside>` keeps its own; the sidebar is what the console owns.
      */}
      {showMobileNav && (
        <BottomNav>
          {items.map(({ key, ...item }) => (
            <BottomNavItem key={key} {...item} />
          ))}
        </BottomNav>
      )}
    </div>
  );
}
