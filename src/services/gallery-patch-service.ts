import {
  createRoom,
  updateRoom,
  deleteRoom,
  deletePropertyImage,
  reorderPropertyImages,
  uploadPropertyImages,
} from './property-service';
import type { GalleryPatch } from '../utils/gallery-draft';

function resolveRoomId(roomId: string | null, idMap: Map<string, string>): string | null {
  if (roomId === null) return null;
  return idMap.get(roomId) ?? roomId;
}

// Executes a GalleryPatch against the API, in the order required to keep the
// backend consistent: create/rename rooms, move photos out of rooms that are
// about to be deleted, delete rooms, delete remaining removed photos, then
// upload new ones.
export async function executeGalleryPatch(propertyId: string, patch: GalleryPatch): Promise<void> {
  const idMap = new Map<string, string>();

  for (const room of patch.roomsToCreate) {
    const created = await createRoom(propertyId, { name: room.name });
    idMap.set(room.tempId, created.id);
  }

  for (const room of patch.roomsToRename) {
    await updateRoom(propertyId, room.roomId, { name: room.name });
  }

  if (patch.imagesToMove.length > 0) {
    await reorderPropertyImages(propertyId, {
      items: patch.imagesToMove.map((item, idx) => ({
        imageId: item.imageId,
        order: idx,
        roomId: resolveRoomId(item.roomId, idMap),
      })),
    });
  }

  for (const roomId of patch.roomsToDelete) {
    await deleteRoom(propertyId, roomId);
  }

  for (const imageId of patch.imagesToDelete) {
    await deletePropertyImage(propertyId, imageId);
  }

  const uploadGroups = new Map<string | null, File[]>();
  for (const item of patch.imagesToUpload) {
    const resolvedRoomId = resolveRoomId(item.roomId, idMap);
    const list = uploadGroups.get(resolvedRoomId) ?? [];
    list.push(item.file);
    uploadGroups.set(resolvedRoomId, list);
  }
  for (const [roomId, files] of uploadGroups) {
    await uploadPropertyImages(propertyId, files, roomId ?? undefined);
  }
}
