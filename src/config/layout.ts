/**
 * Layout Constants - Single Source of Truth
 *
 * Centralizes all fixed component heights and spacings.
 * Use these constants instead of hardcoding values throughout the app.
 */

/**
 * Bottom Navigation Height
 * Formula: pt (8px) + content (~48px) + pb (16px + safe-area-inset-bottom)
 *
 * Use this for padding-bottom in scrollable content that needs to avoid overlap.
 */
export const BOTTOM_NAV_HEIGHT = 'calc(72px + env(safe-area-inset-bottom, 0px))';

/**
 * Bottom Navigation Tailwind Class
 * Use this on scrollable containers that have a bottom nav.
 */
export const BOTTOM_NAV_PADDING = 'pb-[calc(150px+env(safe-area-inset-bottom,px))]';

/**
 * Fixed Bottom Button Height (like "Apply Filters" button)
 * Formula: pt (12px) + button (56px) + pb (16px + safe-area-inset-bottom)
 *
 * Use this for pages with a fixed bottom action button.
 */
export const FIXED_BOTTOM_BUTTON_HEIGHT = 'calc(84px + env(safe-area-inset-bottom, 0px))';

/**
 * Fixed Bottom Button Tailwind Class
 * Use this on scrollable containers that have a fixed bottom button.
 */
export const FIXED_BOTTOM_BUTTON_PADDING = 'pb-[calc(140px+env(safe-area-inset-bottom,0px))]';

/**
 * Safe Area Inset Bottom (iOS)
 * Typical values: 0px (Android/older iOS), 34px (iPhone with notch)
 */
export const SAFE_AREA_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

/**
 * Safe Area Inset Top (iOS)
 * Typical values: 0px (Android), 44-47px (iPhone with notch/Dynamic Island)
 */
export const SAFE_AREA_TOP = 'env(safe-area-inset-top, 0px)';

/**
 * Helper: Get padding class for content above bottom nav
 */
export function getBottomNavPadding(): string {
  return BOTTOM_NAV_PADDING;
}

/**
 * Helper: Get padding class for content above fixed bottom button
 */
export function getFixedBottomButtonPadding(): string {
  return FIXED_BOTTOM_BUTTON_PADDING;
}
