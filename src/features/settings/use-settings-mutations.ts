import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { updateSiteSettings } from '@/features/settings/site-settings-service';
import { createWhatsappNumber, deleteWhatsappNumber } from '@/features/settings/whatsapp-service';
import { settingsKeys } from '@/features/settings/query-keys';
import type { SiteSettings, UpdateSiteSettingsDto } from '@/shared/api/types';

/**
 * Writes for the settings domain.
 *
 * The page used to hand-roll all three: six `useState`s tracking what `useMutation` already
 * exposes (`savingContact`/`contactError`, `addingNumber`/`addNumberError`,
 * `deletingId`/`deleteError`), each wrapped in its own try/catch/finally, each invalidating
 * by a raw string key. That is the same bookkeeping `use-property-mutations.ts` removed from
 * the dashboard, reimplemented one screen over.
 *
 * Like the wizard's two and unlike the dashboard's, these do **not** toast: the settings
 * page shows an inline `role="alert"` next to the section that failed, which is more useful
 * than a corner toast when three independent forms share one screen. `deletingId` is not
 * lost either — it is `variables` on the delete mutation.
 */
function invalidateDomain(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: settingsKeys.all });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateSiteSettingsDto) => updateSiteSettings(dto),
    onSettled: () => invalidateDomain(queryClient),
  });
}

/**
 * Adding a number can also write the contact block, and that is a domain rule rather than a
 * UI one: the first number registered becomes the public WhatsApp, because a contact block
 * with an empty WhatsApp and a number on file is a configuration nobody chose. It lives in
 * the mutation so the two writes settle — and invalidate — as one unit.
 *
 * `isFirst` is passed in rather than derived here: the caller already holds the list from
 * its own query, and re-reading it from the cache inside the mutation would make the rule
 * depend on refetch timing.
 */
export function useCreateWhatsappNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ number, isFirst }: { number: string; isFirst: boolean }) => {
      const created = await createWhatsappNumber({ number, isActive: true });
      let settings: SiteSettings | undefined;
      if (isFirst) settings = await updateSiteSettings({ whatsapp: created.number });
      return { created, settings };
    },
    onSettled: () => invalidateDomain(queryClient),
  });
}

export function useDeleteWhatsappNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWhatsappNumber(id),
    onSettled: () => invalidateDomain(queryClient),
  });
}
