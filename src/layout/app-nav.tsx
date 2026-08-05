import type { ComponentProps, ReactNode } from 'react';
import { Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/cn';

/** A rendered nav entry. */
export interface NavItem {
  icon: ReactNode;
  label: string;
  to: string;
}

/** A nav entry in a list, with the React key the caller uses. */
export interface NavItemDescriptor extends NavItem {
  key: string;
}

/**
 * True when `to` is the current route. `/` is compared exactly — a prefix match would
 * light up the home item on every page.
 */
function useIsActive(to: string): boolean {
  const { pathname } = useLocation();
  return pathname === to || (to !== '/' && pathname.startsWith(to));
}

/**
 * Both navs render `<Link>`, not `<button onClick={navigate}>`.
 *
 * That was not a style preference: a button has no `href`, so ctrl/cmd-click,
 * middle-click, "open in new tab", "copy link address" and right-click context menus all
 * silently did nothing, and assistive tech announced a button where a link was meant. The
 * previous implementations were also near-identical copies of each other, differing only
 * in layout classes — hence one file with two presentations.
 */
export function TopNav({
  className,
  children,
  rightSlot,
  ...props
}: ComponentProps<'nav'> & { rightSlot?: ReactNode }) {
  return (
    <nav
      data-slot="top-nav"
      aria-label="Navegação principal"
      className={cn(
        'relative z-(--z-nav) hidden shrink-0 items-center gap-6 bg-primary px-10 py-10 md:sticky md:top-0 md:flex lg:px-12',
        className,
      )}
      {...props}
    >
      <Link
        to="/"
        className="hidden items-center gap-2 text-lg font-semibold text-primary-foreground transition-opacity md:hover:opacity-80 lg:flex"
      >
        <Home size={20} className="text-action" aria-hidden="true" />
        Minha Imobiliária
      </Link>
      {/* Absolutely positioned so it centers on the nav's full width, ignoring the
          asymmetric widths of the logo (left) and rightSlot (right). */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-12">{children}</div>
      <div className="ml-auto flex items-center justify-end gap-3">{rightSlot}</div>
    </nav>
  );
}

export function TopNavItem({ icon, label, to, className }: NavItem & { className?: string }) {
  const active = useIsActive(to);

  return (
    <Link
      to={to}
      data-slot="top-nav-item"
      data-state={active ? 'active' : 'inactive'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary-foreground/60 transition-colors duration-200 md:hover:bg-white/10 md:hover:text-primary-foreground',
        active && 'bg-white/10 text-primary-foreground',
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/**
 * Space `BottomNav` needs reserved below it on any page whose content could otherwise
 * scroll behind it: `pt-2` (8px) + a 54px item + the nav's own `pb-4` (16px) = 78px, plus
 * `env(safe-area-inset-bottom)` for the home-indicator/gesture-bar area on top of that.
 * `position: fixed`, so the nav never takes part in page layout on its own — pages that
 * can scroll their last item behind it (`settings.tsx`, `login.tsx`, and `dashboard.tsx`
 * with its own extra reserve for a FAB) need to add this themselves.
 */
export const BOTTOM_NAV_CLEARANCE = 'pb-[calc(env(safe-area-inset-bottom,0px)+78px)]';

export function BottomNav({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="bottom-nav"
      aria-label="Navegação principal"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-(--z-fixed) flex items-center justify-around bg-primary px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] md:hidden',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `active` overrides the derived state instead of adding to it.
 *
 * `useIsActive` is a prefix match, which is the right default for the storefront but wrong
 * for the console: there, `/dashboard` is labelled "Imóveis" and has to stay lit across
 * `/properties/new` and `/properties/:id/gallery` — paths that share no prefix with it —
 * while "Ver o site" (`/`) must never light up at all. That policy belongs to the console,
 * not to the design system, so `ConsoleShell` computes it and passes it down. Deriving it
 * here for both callers is what would force `owns` into this file.
 */
export function BottomNavItem({
  icon,
  label,
  to,
  active: activeOverride,
  className,
}: NavItem & { active?: boolean; className?: string }) {
  const derived = useIsActive(to);
  const active = activeOverride ?? derived;

  return (
    <Link
      to={to}
      data-slot="bottom-nav-item"
      data-state={active ? 'active' : 'inactive'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // min-h-11 keeps the tap target at 44px even though the label is 10px —
        // WCAG 2.5.8 asks for at least 24×24 CSS px, and 44 is the comfortable target.
        'flex min-h-11 flex-col items-center justify-center gap-1 px-4 py-2 text-primary-foreground/60 transition-all duration-300 ease-out active:scale-90',
        active && 'text-primary-foreground',
        className,
      )}
    >
      {icon}
      <span className="text-2xs font-medium leading-none">{label}</span>
    </Link>
  );
}
