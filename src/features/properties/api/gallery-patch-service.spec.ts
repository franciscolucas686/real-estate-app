import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GalleryPatch } from '@/features/gallery/gallery-draft';

// Mockado no nível do módulo em vez de via MSW: o que este arquivo decide é
// *quais* chamadas são feitas e em que ordem — a resposta HTTP de cada uma é
// irrelevante aqui, e um mock de módulo deixa a ordem observável diretamente.
vi.mock('@/features/properties/api/property-service', () => ({
  createRoom: vi.fn(async (_propertyId: string, payload: { name: string }) => ({
    id: `real-${payload.name}`,
    name: payload.name,
    order: 0,
  })),
  updateRoom: vi.fn(async () => undefined),
  deleteRoom: vi.fn(async () => undefined),
  bulkDeletePropertyImages: vi.fn(async () => undefined),
  reorderPropertyImages: vi.fn(async () => undefined),
  uploadPropertyImages: vi.fn(async () => ({ images: [], total: 0 })),
}));

const service = await import('@/features/properties/api/property-service');
const { executeGalleryPatch } = await import('@/features/properties/api/gallery-patch-service');

const PROPERTY_ID = 'prop-1';

function patch(overrides: Partial<GalleryPatch> = {}): GalleryPatch {
  return {
    roomsToCreate: [],
    roomsToRename: [],
    roomsToDelete: [],
    imagesToMove: [],
    imagesToDelete: [],
    imagesToUpload: [],
    ...overrides,
  };
}

describe('executeGalleryPatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('apaga todas as fotos numa única requisição em lote', async () => {
    await executeGalleryPatch(PROPERTY_ID, patch({ imagesToDelete: ['a', 'b', 'c', 'd', 'e'] }));

    // O ponto da mudança: era uma requisição por foto contra o endpoint singular,
    // cujo teto é 100/60s — apagar uma galeria grande se auto-limitava.
    expect(service.bulkDeletePropertyImages).toHaveBeenCalledTimes(1);
    expect(service.bulkDeletePropertyImages).toHaveBeenCalledWith(PROPERTY_ID, [
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('não chama o endpoint de lote quando não há nada a apagar', async () => {
    await executeGalleryPatch(
      PROPERTY_ID,
      patch({ roomsToRename: [{ roomId: 'r1', name: 'Sala' }] }),
    );

    expect(service.bulkDeletePropertyImages).not.toHaveBeenCalled();
    expect(service.updateRoom).toHaveBeenCalledWith(PROPERTY_ID, 'r1', { name: 'Sala' });
  });

  it('mantém a ordem exigida pelo backend: criar → renomear → mover → apagar cômodo → apagar foto → subir', async () => {
    const ordem: string[] = [];
    for (const [name, fn] of Object.entries(service)) {
      vi.mocked(fn as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        ordem.push(name);
        return name === 'createRoom' ? { id: 'real-Quarto', name: 'Quarto', order: 0 } : undefined;
      });
    }

    await executeGalleryPatch(
      PROPERTY_ID,
      patch({
        roomsToCreate: [{ tempId: 'tmp-1', name: 'Quarto' }],
        roomsToRename: [{ roomId: 'r1', name: 'Sala' }],
        imagesToMove: [{ imageId: 'img-1', roomId: 'r1' }],
        roomsToDelete: ['r2'],
        imagesToDelete: ['img-2'],
        imagesToUpload: [{ roomId: null, file: new File([''], 'foto.jpg') }],
      }),
    );

    expect(ordem).toEqual([
      'createRoom',
      'updateRoom',
      'reorderPropertyImages',
      'deleteRoom',
      'bulkDeletePropertyImages',
      'uploadPropertyImages',
    ]);
  });

  it('resolve o tempId de um cômodo recém-criado ao subir fotos para ele', async () => {
    const file = new File([''], 'foto.jpg');

    await executeGalleryPatch(
      PROPERTY_ID,
      patch({
        roomsToCreate: [{ tempId: 'tmp-1', name: 'Quarto' }],
        imagesToUpload: [{ roomId: 'tmp-1', file }],
      }),
    );

    expect(service.uploadPropertyImages).toHaveBeenCalledWith(PROPERTY_ID, [file], 'real-Quarto');
  });
});
