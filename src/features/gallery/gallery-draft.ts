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
  /**
   * A foto principal do imóvel, no rascunho. Segue o mesmo par que `roomId`/`originalRoomId`:
   * o valor corrente e o que veio do servidor, que é o que permite saber se o operador
   * mexeu nisso nesta sessão de edição.
   *
   * A exclusividade (uma principal por imóvel) é mantida por quem escreve o rascunho:
   * marcar uma foto desmarca as outras. O backend garante o mesmo na transação dele.
   */
  isMain: boolean;
  originalIsMain: boolean;
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
  /**
   * `draftId` acompanha o arquivo porque uma foto ainda não enviada existe só como id local
   * (`crypto.randomUUID()`), e ela pode ser justamente a escolhida como principal. Quem
   * traduz um id desses para o id real é `executeGalleryPatch`, com a resposta do upload.
   */
  imagesToUpload: { draftId: string; roomId: string | null; file: File }[];
  /**
   * A troca de foto principal, quando houve uma. Um campo só para as duas direções —
   * `isMain: true` define, `false` remove — porque o `DELETE` da API também precisa saber
   * **qual** foto desmarcar, e `mainImageId: string | null` não teria id para mandar na
   * remoção. Ausente quando o operador não mexeu nisso.
   */
  mainImage?: { imageId: string; isMain: boolean };
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

  // Existing photos whose room changed. Executed before any room deletion so a photo
  // moved out of a doomed room keeps its new room instead of being reset by the
  // `SetNull` below.
  const imagesToMove = draftImages
    .filter((img) => !img.isNew && !img.deleted && img.roomId !== img.originalRoomId)
    .map((img) => ({ imageId: img.id, roomId: img.roomId }));

  /*
   * Every existing photo marked as removed — including the ones that belonged to a
   * room being deleted in the same patch.
   *
   * Those used to be excluded, on the belief that "the backend cascades those away
   * with the room". It does not: `PropertyImage.room` is `onDelete: SetNull` in the
   * Prisma schema, and `DELETE /properties/:id/rooms/:roomId` says so in its own
   * summary ("imagens mantidas sem associacao"). So deleting an ambiente detached its
   * photos instead of deleting them, and since `GalleryManagement.handleDeleteRoom`
   * also marks them `deleted`, the patch skipped them entirely: the operator confirmed
   * "excluir o ambiente", watched the photos disappear, saved — and on the next load
   * they were all back under "Sem ambiente", still in the bucket, still counting for
   * the property's ACTIVE status.
   */
  const imagesToDelete = draftImages
    .filter((img) => !img.isNew && img.deleted)
    .map((img) => img.id);

  const imagesToUpload = draftImages
    .filter(
      (img): img is DraftImage & { file: File } => img.isNew && !img.deleted && Boolean(img.file),
    )
    .map((img) => ({ draftId: img.id, roomId: img.roomId, file: img.file }));

  /*
   * A foto principal só entra no patch quando a escolha mudou — sem isso, todo salvamento
   * mandaria uma requisição a mais para reafirmar o que já estava lá.
   *
   * O caso que exige cuidado é a remoção: se a principal foi **excluída** neste mesmo
   * rascunho, não há o que desmarcar. A linha some do banco levando a marcação junto, e
   * mandar o `DELETE .../main` depois seria uma chamada contra um id que não existe mais.
   */
  const nextMain = draftImages.find((img) => img.isMain && !img.deleted);
  const previousMain = draftImages.find((img) => img.originalIsMain);

  let mainImage: GalleryPatch['mainImage'];
  if (nextMain && nextMain.id !== previousMain?.id) {
    mainImage = { imageId: nextMain.id, isMain: true };
  } else if (!nextMain && previousMain && !previousMain.deleted) {
    mainImage = { imageId: previousMain.id, isMain: false };
  }

  return {
    roomsToCreate,
    roomsToRename,
    roomsToDelete,
    imagesToMove,
    imagesToDelete,
    imagesToUpload,
    ...(mainImage && { mainImage }),
  };
}
