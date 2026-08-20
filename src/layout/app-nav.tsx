import type { ComponentProps, ReactNode } from 'react';
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
 * A marca da imobiliária, para as duas shells. Um `<img>` e não um glyph do lucide porque o mark
 * é uma ilustração fotográfica (globo, mãos, cidade), não um ícone de linha — antes daqui a
 * topbar desenhava um `Home` genérico e a sidebar do console as iniciais "FG".
 *
 * **`alt=""` é obrigatório, não descuido.** Os dois call sites já nomeiam o link que envolve a
 * imagem: a topbar pelo texto irmão, que é visível sempre que o link é; o console por um
 * `aria-label`, porque lá o texto ao lado é `hidden lg:inline` e some da árvore de
 * acessibilidade no rail estreito. Um `alt` preenchido faria o leitor de tela anunciar a marca
 * duas vezes.
 *
 * **28px é o piso desta arte.** Ela é fotográfica: abaixo disso as mãos e os prédios viram um
 * borrão azul ao lado de um texto nítido. Se um slot novo precisar de menos que isso, o certo é
 * não usar o mark ali, não encolhê-lo.
 *
 * O caminho do arquivo vive aqui e em nenhum outro lugar destas duas shells:
 * `scripts/generate-icons.mjs` é quem decide os degraus da escada, e renomear um degrau lá não
 * pode virar caça em dois arquivos. Note que ele **não** passa por `imageUrl()` — aquilo
 * reescreve para `/cdn-cgi/image/...` e existe para foto de imóvel vinda da API; este é um asset
 * estático do próprio deploy.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // 128 cobre os dois slots em DPR 3 (40 × 3 = 120). Um degrau só, sem `srcSet`: a topbar
    // aparece em toda página da vitrine, então um arquivo cacheado bate três alternativas.
    <img src="/icons/logo-128.webp" alt="" className={cn('shrink-0 object-contain', className)} />
  );
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
        // Not sticky: the nav scrolls away with the page and comes back when the reader
        // returns to the top. It used to pin, which meant every sticky element on a page had
        // to reserve `--site-nav-height` above itself or spend the whole scroll behind the
        // bar — the property detail's contact rail did exactly that. Pinning it again means
        // reintroducing that clearance everywhere, not just flipping this class.
        //
        // The height stays declared rather than derived from `py-10` plus the tallest
        // in-flow child, which is *nothing* below `lg` and a fluid `text-lg` logo above it.
        // `--site-nav-height` is defined in `index.css`; applied here so the token and the
        // element it measures cannot disagree.
        'relative z-(--z-nav) hidden shrink-0 items-center gap-6 bg-primary px-10 md:flex md:h-(--site-nav-height) lg:px-12',
        className,
      )}
      {...props}
    >
      <Link
        to="/"
        className="hidden items-center gap-4 text-lg font-semibold text-primary-foreground transition-opacity md:hover:opacity-80 lg:flex"
      >
        <BrandMark className="size-7" />
        Francine Gestora Imobiliária
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

export function BottomNavItem({ icon, label, to, className }: NavItem & { className?: string }) {
  const active = useIsActive(to);

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
