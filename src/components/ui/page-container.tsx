import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Global layout container — the ONLY source of horizontal padding in the PWA.
 *
 * Token: px-4 (16px)
 *
 * Rules:
 * - Every page MUST be wrapped in PageContainer (or use it for content sections).
 * - No child component may define its own horizontal padding/margin.
 * - Full-bleed elements (carousels, images, sticky headers) must use
 *   `className="-mx-4"` or be placed outside the PageContainer.
 */

export const LAYOUT_PADDING_X = 'px-6';

export interface PageContainerProps extends ComponentProps<'div'> {
  /**
   * When true, adds safe-area-inset-top padding to prevent content from going under iOS notch.
   * Use for headers and top-level content on pages.
   * @default false
   */
  withSafeAreaTop?: boolean;
}

export function PageContainer({
  className,
  children,
  withSafeAreaTop = false,
  ...props
}: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={twMerge(
        LAYOUT_PADDING_X,
        className,
        withSafeAreaTop && 'pt-[calc(env(safe-area-inset-top,0px)+16px)]',
      )}
      {...props}
    >
      {children}
    </div>
  );
}
