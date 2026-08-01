import type { ReactNode } from 'react';
import { SkipLink } from '@/layout/skip-link';
import {
  BottomNav,
  BottomNavItem,
  TopNav,
  TopNavItem,
  type NavItemDescriptor,
} from '@/layout/app-nav';

export interface SiteShellProps {
  children: ReactNode;
  /**
   * Nav entries, supplied by the app layer. They arrive as props rather than being read
   * here because building them requires the session, and `layout/` must stay free of
   * domain knowledge — the lint zone rejects the import outright.
   */
  items: NavItemDescriptor[];
  /**
   * Suppresses the mobile bottom nav. False for single-task public screens (filters, a
   * property detail), where the nav competes with the screen's action and eats the
   * vertical space that action needs.
   */
  showMobileNav?: boolean;
}

/** Public storefront chrome: top nav on desktop, bottom nav on mobile. */
export function SiteShell({ children, items, showMobileNav = true }: SiteShellProps) {
  return (
    <div data-slot="site-shell" className="md:flex md:min-h-dvh md:flex-col">
      <SkipLink />
      <TopNav>
        {items.map(({ key, ...item }) => (
          <TopNavItem key={key} {...item} />
        ))}
      </TopNav>

      <div id="conteudo" className="md:min-h-0 md:flex-1">
        {children}
      </div>

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
