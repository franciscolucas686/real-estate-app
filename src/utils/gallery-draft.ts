// Local (unsaved) representation of a property's gallery, used by the gallery
// management screen to let the user freely add/remove/move rooms and photos
// before anything is persisted. `buildGalleryPatch` is a pure diff: given the
// current draft state, it returns the ordered set of API operations needed
// to bring the backend in line with it. It has no knowledge of the API,
// React Query, or React state.

export interface DraftRoom {
  id: string;
  name: string;
  originalName: string | null;
  isNew: boolean;
  deleted: boolean;
}

export interface DraftImage {
  id: string;
  url: string;
  label: string | null;
  roomId: string | null;
  originalRoomId: string | null;
  isNew: boolean;
  deleted: boolean;
  file?: File;
}

export interface GalleryPatch {
  roomsToCreate: { tempId: string; name: string }[];
  roomsToRename: { roomId: string; name: string }[];
  roomsToDelete: string[];
  imagesToMove: { imageId: string; roomId: string | null }[];
  imagesToDelete: string[];
  imagesToUpload: { roomId: string | null; file: File }[];
}

export function buildGalleryPatch(
  draftRooms: DraftRoom[],
  draftImages: DraftImage[],
): GalleryPatch {
  const roomsToCreate = draftRooms
    .filter((r) => r.isNew && !r.deleted)
    .map((r) => ({ tempId: r.id, name: r.name }));

  const roomsToRename = draftRooms
    .filter((r) => !r.isNew && !r.deleted && r.name !== r.originalName)
    .map((r) => ({ roomId: r.id, name: r.name }));

  const roomsToDelete = draftRooms.filter((r) => !r.isNew && r.deleted).map((r) => r.id);
  const deletedRoomIds = new Set(roomsToDelete);

  // Existing photos whose room changed — resolved/executed before any room
  // deletion so photos rescued out of a doomed room aren't cascaded away.
  const imagesToMove = draftImages
    .filter((img) => !img.isNew && !img.deleted && img.roomId !== img.originalRoomId)
    .map((img) => ({ imageId: img.id, roomId: img.roomId }));

  // Individually-removed existing photos, excluding ones already covered by
  // a room deletion above (the backend cascades those away with the room).
  const imagesToDelete = draftImages
    .filter(
      (img) =>
        !img.isNew &&
        img.deleted &&
        !(img.originalRoomId !== null && deletedRoomIds.has(img.originalRoomId)),
    )
    .map((img) => img.id);

  const imagesToUpload = draftImages
    .filter(
      (img): img is DraftImage & { file: File } => img.isNew && !img.deleted && Boolean(img.file),
    )
    .map((img) => ({ roomId: img.roomId, file: img.file }));

  return {
    roomsToCreate,
    roomsToRename,
    roomsToDelete,
    imagesToMove,
    imagesToDelete,
    imagesToUpload,
  };
}
