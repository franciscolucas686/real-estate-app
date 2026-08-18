/**
 * Query keys for the settings domain, in the same shape as `propertyKeys`.
 *
 * These were raw tuples written by hand at eight call sites across two files —
 * `['site-settings']` in `pages/settings.tsx` *and* `pages/contact.tsx`, plus
 * `['whatsapp-numbers']` in settings. Two files having to agree on a string literal is the
 * exact failure the properties factory was created to remove: a typo does not error, it
 * silently opens a second cache entry that no write ever invalidates.
 *
 * `site-settings` is the pair's root because the storefront's contact page reads the same
 * record the console edits — invalidating one has to reach the other.
 *
 * `as const` keeps the tuples literal so TanStack Query's prefix matching behaves.
 */
export const settingsKeys = {
  all: ['site-settings'] as const,

  /** The public contact block: e-mail, Instagram, WhatsApp, opening hours. */
  siteSettings: () => [...settingsKeys.all] as const,

  /** The operator's list of WhatsApp numbers, which feeds the block above. */
  whatsappNumbers: () => [...settingsKeys.all, 'whatsapp-numbers'] as const,
};
