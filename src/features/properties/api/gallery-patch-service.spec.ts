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
  setMainPropertyImage: vi.fn(async () => []),
  unsetMainPropertyImage: vi.fn(async () => []),
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

  it('sobe 50 fotos de um mesmo ambiente em lotes, sem perder nenhuma', async () => {
    const files = Array.from({ length: 50 }, (_, i) => new File([''], `foto-${i}.jpg`));

    await executeGalleryPatch(
      PROPERTY_ID,
      patch({
        imagesToUpload: files.map((file, i) => ({ draftId: `d-${i}`, roomId: 'r1', file })),
      }),
    );

    // O que importa é a distinção que o lote existe para preservar: o limite é por
    // requisição, não por imóvel. Cinquenta fotos continuam chegando inteiras.
    const enviadas = vi
      .mocked(service.uploadPropertyImages)
      .mock.calls.flatMap(([, batch]) => batch);
    expect(enviadas).toHaveLength(50);
    expect(enviadas).toEqual(files);

    // ...distribuídas em lotes, nenhum acima do teto que o backend aceita.
    const calls = vi.mocked(service.uploadPropertyImages).mock.calls;
    expect(calls).toHaveLength(5);
    for (const [, batch] of calls) {
      expect(batch.length).toBeLessThanOrEqual(12);
    }
  });

  it('mantém cada lote apontado para o ambiente certo', async () => {
    const daSala = Array.from({ length: 13 }, (_, i) => new File([''], `sala-${i}.jpg`));
    const doQuarto = [new File([''], 'quarto-0.jpg')];

    await executeGalleryPatch(
      PROPERTY_ID,
      patch({
        imagesToUpload: [
          ...daSala.map((file, i) => ({ draftId: `sala-${i}`, roomId: 'r1', file })),
          ...doQuarto.map((file, i) => ({ draftId: `quarto-${i}`, roomId: 'r2', file })),
        ],
      }),
    );

    // 13 fotos da sala viram dois lotes, e ambos precisam continuar dizendo "r1" —
    // fatiar sem carregar o roomId junto espalharia as fotos pelo ambiente errado.
    const porAmbiente = vi
      .mocked(service.uploadPropertyImages)
      .mock.calls.map(([, batch, roomId]) => [roomId, batch.length]);

    expect(porAmbiente).toEqual([
      ['r1', 12],
      ['r1', 1],
      ['r2', 1],
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
        if (name === 'createRoom') return { id: 'real-Quarto', name: 'Quarto', order: 0 };
        // O upload precisa devolver a forma real mesmo aqui: o executor lê `images` da
        // resposta para traduzir o id local de uma foto recém-criada. E `clearAllMocks` não
        // desfaz `mockImplementation`, então esta implementação vale para os testes seguintes.
        if (name === 'uploadPropertyImages') return { images: [], total: 0 };
        return undefined;
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
        imagesToUpload: [{ draftId: 'd-1', roomId: null, file: new File([''], 'foto.jpg') }],
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
        imagesToUpload: [{ draftId: 'd-1', roomId: 'tmp-1', file }],
      }),
    );

    expect(service.uploadPropertyImages).toHaveBeenCalledWith(PROPERTY_ID, [file], 'real-Quarto');
  });

  describe('foto principal', () => {
    it('não chama nenhuma das duas rotas quando o patch não traz a escolha', async () => {
      await executeGalleryPatch(PROPERTY_ID, patch({ imagesToDelete: ['img-1'] }));

      expect(service.setMainPropertyImage).not.toHaveBeenCalled();
      expect(service.unsetMainPropertyImage).not.toHaveBeenCalled();
    });

    it('define a principal de uma foto que já existia', async () => {
      await executeGalleryPatch(
        PROPERTY_ID,
        patch({ mainImage: { imageId: 'img-1', isMain: true } }),
      );

      expect(service.setMainPropertyImage).toHaveBeenCalledWith(PROPERTY_ID, 'img-1');
      expect(service.unsetMainPropertyImage).not.toHaveBeenCalled();
    });

    it('remove a principal pela outra rota', async () => {
      await executeGalleryPatch(
        PROPERTY_ID,
        patch({ mainImage: { imageId: 'img-1', isMain: false } }),
      );

      expect(service.unsetMainPropertyImage).toHaveBeenCalledWith(PROPERTY_ID, 'img-1');
      expect(service.setMainPropertyImage).not.toHaveBeenCalled();
    });

    /*
     * O caminho da **criação de imóvel**: a foto escolhida nem existia no servidor quando o
     * operador a marcou. O id local precisa virar o id real antes da chamada, pela posição do
     * arquivo dentro do lote.
     */
    it('traduz o id local de uma foto recém-enviada', async () => {
      vi.mocked(service.uploadPropertyImages).mockResolvedValueOnce({
        images: [
          { id: 'real-1', url: 'u1', label: null, order: 0, isMain: false },
          { id: 'real-2', url: 'u2', label: null, order: 1, isMain: false },
        ],
        total: 2,
      });

      await executeGalleryPatch(
        PROPERTY_ID,
        patch({
          imagesToUpload: [
            { draftId: 'temp-1', roomId: null, file: new File([''], 'a.jpg') },
            { draftId: 'temp-2', roomId: null, file: new File([''], 'b.jpg') },
          ],
          mainImage: { imageId: 'temp-2', isMain: true },
        }),
      );

      expect(service.setMainPropertyImage).toHaveBeenCalledWith(PROPERTY_ID, 'real-2');
    });

    // Depois do upload de propósito: antes dele o id da foto escolhida não existe no servidor.
    it('é a última chamada do patch', async () => {
      const ordem: string[] = [];
      for (const [name, fn] of Object.entries(service)) {
        vi.mocked(fn as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          ordem.push(name);
          if (name === 'uploadPropertyImages') return { images: [], total: 0 };
          return undefined;
        });
      }

      await executeGalleryPatch(
        PROPERTY_ID,
        patch({
          imagesToDelete: ['img-9'],
          imagesToUpload: [{ draftId: 'temp-1', roomId: null, file: new File([''], 'a.jpg') }],
          mainImage: { imageId: 'img-1', isMain: true },
        }),
      );

      expect(ordem.at(-1)).toBe('setMainPropertyImage');
    });
  });
});
