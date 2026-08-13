import type { PropertyImageDto } from '@/shared/api/types';

/**
 * One ambiente as the gallery screen renders it: the room's identity plus the photos
 * currently assigned to it in the unsaved draft.
 *
 * Distinct from `DraftRoom`/`DraftImage` in `gallery-draft.ts`, which are the *edit* model
 * the patch is built from. This is the view model derived from them — the page computes it,
 * and `RoomSection`, `RoomFullscreen` and `MoveDialog` consume it.
 */
export interface GallerySection {
  roomId: string | null;
  name: string;
  images: PropertyImageDto[];
}
