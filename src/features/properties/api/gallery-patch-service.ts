import {
  createRoom,
  updateRoom,
  deleteRoom,
  bulkDeletePropertyImages,
  reorderPropertyImages,
  uploadPropertyImages,
} from '@/features/properties/api/property-service';
import type { GalleryPatch } from '@/features/gallery/gallery-draft';

/**
 * Quantas fotos vão em cada requisição de upload.
 *
 * **Não é um limite de fotos por imóvel** — não existe nenhum. Um ambiente com 50
 * fotos continua recebendo as 50; elas só chegam em cinco requisições em vez de uma.
 *
 * O motivo é memória do servidor: o Multer bufferiza em RAM todos os arquivos de
 * uma requisição antes do handler rodar, e eles ficam vivos até ela terminar. Cinquenta
 * fotos de celular de uma vez eram ~200MB só de buffer de origem, o que não deixava
 * margem para dois corretores subindo fotos ao mesmo tempo na mesma instância.
 *
 * Espelha `UPLOAD_MAX_FILES_PER_REQUEST` em
 * `api-real-estate/src/properties/properties.controller.ts`. Se lá diminuir e aqui
 * não, o lote passa a ser rejeitado com 400.
 */
const UPLOAD_BATCH_SIZE = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function resolveRoomId(roomId: string | null, idMap: Map<string, string>): string | null {
  if (roomId === null) return null;
  return idMap.get(roomId) ?? roomId;
}

// Executes a GalleryPatch against the API, in the order required to keep the backend
// consistent: create/rename rooms, move photos out of rooms that are about to be
// deleted, delete rooms, delete the removed photos, then upload the new ones.
//
// Deleting a room does not delete its photos — the FK is `onDelete: SetNull`, so they
// come back as "Sem ambiente" (see `buildGalleryPatch`). That is why the delete step
// still has work to do after the room is gone, and why it must come after: the ids
// survive the room, so `bulkDeletePropertyImages` still matches them.
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

  // Uma chamada, não uma por foto. O laço anterior mandava N requisições contra o
  // endpoint singular, cujo teto é 100/60s — apagar uma galeria grande de uma vez
  // se auto-limitava. O endpoint de lote já existia e só não era usado aqui.
  if (patch.imagesToDelete.length > 0) {
    await bulkDeletePropertyImages(propertyId, patch.imagesToDelete);
  }

  const uploadGroups = new Map<string | null, File[]>();
  for (const item of patch.imagesToUpload) {
    const resolvedRoomId = resolveRoomId(item.roomId, idMap);
    const list = uploadGroups.get(resolvedRoomId) ?? [];
    list.push(item.file);
    uploadGroups.set(resolvedRoomId, list);
  }
  for (const [roomId, files] of uploadGroups) {
    for (const batch of chunk(files, UPLOAD_BATCH_SIZE)) {
      await uploadPropertyImages(propertyId, batch, roomId ?? undefined);
    }
  }
}
