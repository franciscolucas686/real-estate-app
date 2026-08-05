import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, Store } from 'lucide-react';
import { cn } from '@/shared/cn';
import { SkipLink } from '@/layout/skip-link';
import { BottomNav, BottomNavItem } from '@/layout/app-nav';

interface ConsoleNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Also highlight for these path prefixes — e.g. the property wizard belongs to "Imóveis". */
  owns?: string[];
}

const CONSOLE_NAV: ConsoleNavItem[] = [
  {
    to: '/dashboard',
    label: 'Imóveis',
    icon: <LayoutDashboard size={22} aria-hidden="true" />,
    owns: ['/properties/new', '/properties/'],
  },
  {
    to: '/settings',
    label: 'Configurações',
    icon: <SettingsIcon size={22} aria-hidden="true" />,
  },
  {
    // The operator is also a visitor: checking how a listing looks once published is a
    // routine part of the job, so the way out of the console is a first-class entry.
    to: '/',
    label: 'Ver o site',
    icon: <Store size={22} aria-hidden="true" />,
  },
];

/** Plain function, not a hook: pathname is passed in, so it is safe to call inside .map(). */
function isActive(item: ConsoleNavItem, pathname: string): boolean {
  if (item.to === '/') return false; // the escape hatch is never "where you are"
  return pathname === item.to || (item.owns ?? []).some((prefix) => pathname.startsWith(prefix));
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
  showMobileNav = true,
}: {
  children: ReactNode;
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
        <Link
          to="/dashboard"
          className="mb-4 flex items-center gap-2 rounded-xl px-2 py-2 text-primary-foreground transition-opacity md:hover:opacity-80"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-action text-sm font-bold">
            MI
          </span>
          <span className="hidden truncate text-sm font-semibold lg:inline">Minha Imobiliária</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {CONSOLE_NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-primary-foreground/60 transition-colors md:hover:bg-white/10 md:hover:text-primary-foreground',
                  active && 'bg-action text-primary-foreground',
                  item.to === '/' && 'mt-auto',
                )}
              >
                {item.icon}
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div id="conteudo" className="flex min-w-0 flex-1 flex-col">
        {children}
      </div>

      {/*
        Same bar as the storefront's, from the same component. It used to be a byte-for-byte
        copy of `BottomNav` + `BottomNavItem` living here, which meant the bar's height —
        78px plus the safe-area inset — was encoded in two places and true in neither: the
        dashboard reserved `pb-28` for it and clipped its own last row on a notched phone.
        Only the active-state policy stays local, passed down as `active`.
      */}
      {showMobileNav && (
        <BottomNav aria-label="Seções do painel">
          {CONSOLE_NAV.map((item) => (
            <BottomNavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              active={isActive(item, pathname)}
            />
          ))}
        </BottomNav>
      )}
    </div>
  );
}
