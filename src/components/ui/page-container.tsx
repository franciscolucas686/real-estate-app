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

export type PageContainerProps = ComponentProps<'div'>;

export function PageContainer({ className, children, ...props }: PageContainerProps) {
  return (
    <div data-slot="page-container" className={twMerge(LAYOUT_PADDING_X, className)} {...props}>
      {children}
    </div>
  );
}
