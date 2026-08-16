import { describe, expect, it } from 'vitest';
import { buildGalleryPatch, type DraftImage, type DraftRoom } from './gallery-draft';

function room(overrides: Partial<DraftRoom> = {}): DraftRoom {
  return {
    id: 'r1',
    name: 'Sala',
    originalName: 'Sala',
    isNew: false,
    deleted: false,
    ...overrides,
  };
}

function image(overrides: Partial<DraftImage> = {}): DraftImage {
  return {
    id: 'img-1',
    url: 'https://bucket/prop-1/a.jpg',
    label: null,
    roomId: null,
    originalRoomId: null,
    isNew: false,
    deleted: false,
    ...overrides,
  };
}

describe('buildGalleryPatch', () => {
  /*
   * A regressão que este arquivo existe para travar.
   *
   * As fotos de um ambiente excluído eram omitidas de `imagesToDelete`, na premissa de
   * que o backend as apagaria junto com o cômodo. Ele não apaga: a FK é
   * `onDelete: SetNull`, e a própria rota diz isso ("imagens mantidas sem associacao").
   * O resultado é que excluir um ambiente com fotos dava certo na tela e voltava atrás
   * no reload — as fotos reapareciam em "Sem ambiente".
   */
  it('apaga as fotos do ambiente excluído — o backend não as cascateia', () => {
    const patch = buildGalleryPatch(
      [room({ id: 'r1', deleted: true })],
      [image({ id: 'img-1', roomId: 'r1', originalRoomId: 'r1', deleted: true })],
    );

    expect(patch.roomsToDelete).toEqual(['r1']);
    expect(patch.imagesToDelete).toEqual(['img-1']);
  });

  it('uma foto resgatada do ambiente antes da exclusão é movida, não apagada', () => {
    const patch = buildGalleryPatch(
      [
        room({ id: 'r1', deleted: true }),
        room({ id: 'r2', name: 'Quarto', originalName: 'Quarto' }),
      ],
      [image({ id: 'img-1', roomId: 'r2', originalRoomId: 'r1' })],
    );

    expect(patch.imagesToMove).toEqual([{ imageId: 'img-1', roomId: 'r2' }]);
    expect(patch.imagesToDelete).toEqual([]);
  });

  it('foto nova marcada como excluída não vira requisição nenhuma', () => {
    const patch = buildGalleryPatch(
      [],
      [image({ id: 'temp-1', isNew: true, deleted: true, file: new File([], 'a.jpg') })],
    );

    expect(patch.imagesToDelete).toEqual([]);
    expect(patch.imagesToUpload).toEqual([]);
  });

  it('ambiente novo e excluído no mesmo rascunho não chega ao servidor', () => {
    const patch = buildGalleryPatch([room({ id: 'temp-r', isNew: true, deleted: true })], []);

    expect(patch.roomsToCreate).toEqual([]);
    expect(patch.roomsToDelete).toEqual([]);
  });

  it('renomear só entra no patch quando o nome mudou de fato', () => {
    const patch = buildGalleryPatch(
      [
        room({ id: 'r1', name: 'Sala de estar' }),
        room({ id: 'r2', name: 'Quarto', originalName: 'Quarto' }),
      ],
      [],
    );

    expect(patch.roomsToRename).toEqual([{ roomId: 'r1', name: 'Sala de estar' }]);
  });
});
