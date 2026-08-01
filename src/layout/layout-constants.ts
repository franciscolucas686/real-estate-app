/**
 * Layout Constants
 *
 * Padding applied to scrollable content so it clears the fixed elements at the
 * bottom of the viewport (nav bar, action button) plus the iOS home indicator.
 *
 * These are empirically tuned totals, not `height + gap` arithmetic — an earlier
 * version also exported the raw component heights, which drifted out of sync with
 * these values and was never imported anywhere. Only export what is consumed.
 */

/**
 * Bottom padding for scrollable containers sitting above the bottom nav.
 */
export const BOTTOM_NAV_PADDING = 'pb-[calc(150px+env(safe-area-inset-bottom,0px))]';

/**
 * Bottom padding for scrollable containers sitting above a fixed action button
 * (e.g. the filters page's "Aplicar filtros").
 */
export const FIXED_BOTTOM_BUTTON_PADDING = 'pb-[calc(140px+env(safe-area-inset-bottom,0px))]';
