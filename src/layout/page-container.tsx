import type { ComponentProps } from 'react';
import { cn } from '@/shared/cn';

/**
 * Global layout container — the ONLY source of horizontal padding in the PWA.
 *
 * Token: `px-gutter` (--spacing-gutter, 24px), growing at md/lg for desktop gutters.
 *
 * Rules:
 * - Every page MUST be wrapped in PageContainer (or use it for content sections).
 * - No child component may define its own horizontal padding/margin.
 * - Full-bleed elements (carousels, images, sticky headers) must use
 *   `className="-mx-gutter"` — the negative of this container's own padding — or be
 *   placed outside the PageContainer. The old docblock said `-mx-4` while the padding was
 *   `px-6`, which left a 8px sliver of background beside anything that followed it.
 * - Desktop max-width must go through the `maxWidth` prop, never as an
 *   ad hoc `md:max-w-*` in a call site's `className` — that recreates the
 *   duplication this component exists to prevent.
 */

export const LAYOUT_PADDING_X = 'px-gutter';

// Non-'none' variants also grow the horizontal gutter at md/lg so centered
// content doesn't hug the viewport edge on wide screens. 'none' stays plain
// px-6 at every size so pages that don't opt in render byte-identical to
// today.
export const MAX_WIDTH_VARIANTS = {
  none: '',
  reading: 'md:max-w-2xl md:mx-auto md:px-10 lg:px-12',
  content: 'md:max-w-3xl lg:max-w-4xl md:mx-auto md:px-10 lg:px-12',
  // Full-bleed (no cap) up through xl, then frozen at the 2xl breakpoint's
  // own width (1536px) so the grid doesn't keep stretching on ultra-wide
  // screens — extra space becomes centered margin instead.
  //
  // `w-full` is required alongside `2xl:mx-auto`: an `auto` cross-axis
  // margin on a flex item (page-search is `flex flex-col`) disables the
  // default stretch sizing and falls back to shrink-to-fit, which would
  // collapse this container to its content's width whenever that content
  // is narrow (e.g. the "no results" empty state) instead of filling up to
  // the 1536px cap. An explicit `w-full` sidesteps that by giving the auto
  // margins a definite 100%-then-capped box to center, same as the
  // familiar mx-auto + max-w pattern in normal block layout.
  wide: 'w-full md:px-10 lg:px-12 2xl:mx-auto 2xl:max-w-[1536px]',
} as const;

export type PageContainerMaxWidth = keyof typeof MAX_WIDTH_VARIANTS;

/**
 * Desktop max-width + centering only, without PageContainer's own gutter
 * padding (md:px-10 lg:px-12) — for call sites that manage their own
 * padding (e.g. fixed bottom action bars) but must still track a page's
 * content width instead of hand-rolling their own `md:max-w-*` literals.
 */
export const MAX_WIDTH_CENTER = {
  none: '',
  reading: 'md:max-w-2xl md:mx-auto',
  content: 'md:max-w-3xl lg:max-w-4xl md:mx-auto',
  wide: 'w-full 2xl:mx-auto 2xl:max-w-[1536px]',
} as const satisfies Record<PageContainerMaxWidth, string>;

export interface PageContainerProps extends ComponentProps<'div'> {
  /**
   * When true, adds safe-area-inset-top padding to prevent content from going under iOS notch.
   * Use for headers and top-level content on pages.
   * @default false
   */
  withSafeAreaTop?: boolean;
  /**
   * Desktop content width cap. No-op below `md:`, so mobile is unaffected.
   * @default 'none'
   */
  maxWidth?: PageContainerMaxWidth;
}

export function PageContainer({
  className,
  children,
  withSafeAreaTop = false,
  maxWidth = 'none',
  ...props
}: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn(
        LAYOUT_PADDING_X,
        MAX_WIDTH_VARIANTS[maxWidth],
        className,
        withSafeAreaTop && 'pt-[calc(env(safe-area-inset-top,0px)+16px)]',
      )}
      {...props}
    >
      {children}
    </div>
  );
}
