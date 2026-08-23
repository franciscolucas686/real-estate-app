import { afterEach, describe, expect, it } from 'vitest';
import {
  galleryRoomSchema,
  isImageFile,
  meetsMinimumWidth,
  MIN_UPLOAD_WIDTH,
} from '@/features/gallery/gallery-room.schema';

describe('galleryRoomSchema (mirrors CreatePropertyRoomDto)', () => {
  it('accepts a non-empty name and trims it', () => {
    const result = galleryRoomSchema.safeParse({ name: '  Sala  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Sala');
  });

  it('rejects an empty name', () => {
    expect(galleryRoomSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects a whitespace-only name', () => {
    expect(galleryRoomSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('isImageFile', () => {
  it('accepts image mimetypes', () => {
    expect(isImageFile(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
  });

  it('rejects non-image mimetypes', () => {
    expect(isImageFile(new File([''], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });
});

describe('meetsMinimumWidth', () => {
  // O jsdom não decodifica imagem nenhuma: nem `onload` nem `onerror` disparam sozinhos
  // num `new Image()` de verdade, então cada teste finge o resultado da decodificação.
  const RealImage = window.Image;

  function stubImage(naturalWidth: number) {
    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = naturalWidth;
      set src(_url: string) {
        this.onload?.();
      }
    } as unknown as typeof Image;
  }

  afterEach(() => {
    window.Image = RealImage;
  });

  it('aceita uma foto na largura mínima ou acima', async () => {
    stubImage(MIN_UPLOAD_WIDTH);
    await expect(meetsMinimumWidth(new File([''], 'a.jpg', { type: 'image/jpeg' }))).resolves.toBe(
      true,
    );
  });

  it('rejeita uma foto abaixo da largura mínima', async () => {
    stubImage(MIN_UPLOAD_WIDTH - 1);
    await expect(meetsMinimumWidth(new File([''], 'a.jpg', { type: 'image/jpeg' }))).resolves.toBe(
      false,
    );
  });

  it('deixa passar um arquivo que o navegador não consegue decodificar', async () => {
    window.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_url: string) {
        this.onerror?.();
      }
    } as unknown as typeof Image;

    await expect(meetsMinimumWidth(new File([''], 'a.jpg', { type: 'image/jpeg' }))).resolves.toBe(
      true,
    );
  });
});
