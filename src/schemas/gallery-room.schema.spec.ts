import { describe, expect, it } from 'vitest';
import { galleryRoomSchema, isImageFile } from './gallery-room.schema';

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
