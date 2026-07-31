import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '@/features/properties/query-keys';

/**
 * Invalidates everything cached about properties.
 *
 * Kept for the screens that still write outside a `useMutation` —
 * `property-details.tsx`'s post-create flow. New code should use the hooks in
 * `use-property-mutations.ts`, which invalidate in `onSettled`; this helper exists so
 * the remaining call sites don't need to know the key layout.
 *
 * It previously listed three keys by hand: `['properties']`,
 * `['property-status-counts']` and `['property', id]`. Once the keys became
 * hierarchical, the last two stopped matching anything and were silently no-ops. One
 * prefix now covers lists, details and counts.
 */
export function usePropertyMutationRefresh() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: propertyKeys.all });
  }, [queryClient]);
}
