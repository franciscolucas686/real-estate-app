import { type ComponentProps } from 'react';
import { cn } from '@/shared/cn';
import { BOTTOM_NAV_PADDING, FIXED_BOTTOM_BUTTON_PADDING } from '@/layout/layout-constants';

export interface ScrollableContentProps extends ComponentProps<'div'> {
  /**
   * Whether this content is on a page with bottom navigation.
   * When true, adds appropriate padding to prevent content from being covered.
   * @default true
   */
  hasBottomNav?: boolean;

  /**
   * Whether this content is on a page with a fixed bottom button (like "Apply Filters").
   * When true, uses taller padding to account for the button.
   * Takes precedence over hasBottomNav.
   * @default false
   */
  hasFixedBottomButton?: boolean;

  /**
   * Custom bottom padding if needed.
   * Overrides the default bottom nav/button padding.
   */
  bottomPadding?: string;
}

/**
 * ScrollableContent - Wrapper for scrollable content areas
 *
 * Automatically handles:
 * - Scroll isolation (flex-1 overflow-y-auto)
 * - Bottom nav/button padding (iOS safe-area aware)
 * - Overscroll behavior (prevents iOS bounce)
 *
 * Usage:
 * ```tsx
 * <div className="flex h-dvh flex-col">
 *   <Header />
 *   <ScrollableContent hasBottomNav={true}>
 *     <PageContainer>
 *       <YourContent />
 *     </PageContainer>
 *   </ScrollableContent>
 * </div>
 * ```
 */
export function ScrollableContent({
  className,
  children,
  hasBottomNav = true,
  hasFixedBottomButton = false,
  bottomPadding,
  ...props
}: ScrollableContentProps) {
  // Determine which padding to use
  const defaultPadding = hasFixedBottomButton
    ? FIXED_BOTTOM_BUTTON_PADDING
    : hasBottomNav
      ? BOTTOM_NAV_PADDING
      : undefined;

  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto overscroll-none',
        !bottomPadding && defaultPadding,
        bottomPadding,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
