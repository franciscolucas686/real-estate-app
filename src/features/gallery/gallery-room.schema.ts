import { z } from 'zod';

// Mirrors CreatePropertyRoomDto (src/properties/dto/create-property-room.dto.ts):
// @MinLength(1) name.
export const galleryRoomSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do ambiente.'),
});

export type GalleryRoomFormValues = z.infer<typeof galleryRoomSchema>;

// Backend never validates mimetype/size on upload (Sharp processes any
// buffer) — this only enforces what the <input accept="image/*"> already
// implies, it doesn't invent a size cap the backend doesn't have.
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
