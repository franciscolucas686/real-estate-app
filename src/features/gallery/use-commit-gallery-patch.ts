import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeGalleryPatch } from '@/features/properties/api/gallery-patch-service';
import { propertyKeys } from '@/features/properties/query-keys';
import type { GalleryPatch } from '@/features/gallery/gallery-draft';

/**
 * Commits the gallery draft — rooms created/renamed/deleted, photos moved/deleted/
 * uploaded — as the single write at the end of the editing session.
 *
 * `executeGalleryPatch` is intentionally left untouched: the order of its calls
 * (create rooms → rename → move images out of rooms about to be deleted → delete
 * rooms → delete images → upload) is a consistency requirement of the backend, not an
 * implementation detail worth re-deriving. This hook only wraps it so the caller gets
 * `isPending`/`error` from one place and, crucially, so cache invalidation is
 * **awaited before navigation**.
 *
 * That last part was a real defect: the page called the refresh helper without
 * awaiting it and navigated immediately, so returning to the dashboard could render
 * from a cache that still had the pre-upload photo counts — and therefore the old
 * status, since status is derived from photo count.
 */
export function useCommitGalleryPatch(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: GalleryPatch) => executeGalleryPatch(propertyId, patch),
    // Awaited by TanStack Query before the mutation settles, so `mutateAsync`
    // resolving means the caches are already refreshed.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}
