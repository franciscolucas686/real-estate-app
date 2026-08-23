import { z } from 'zod';
import { IMAGE_WIDTHS } from '@/shared/image-url';

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

/**
 * `IMAGE_WIDTHS.card` (1600px) is the widest any screen ever asks `imageUrl()` for — the
 * full-bleed carrossel/foto principal do detalhe. Abaixo disso o navegador amplia a foto pra
 * preencher a caixa, e ampliação não inventa nitidez que o arquivo não tem: o card de
 * listagem fica borrado, e o backend nunca valida isso no upload (Sharp processa qualquer
 * buffer). Checar aqui, antes do upload, é a única forma de pegar isso antes de virar defeito
 * visível pro visitante.
 */
export const MIN_UPLOAD_WIDTH = IMAGE_WIDTHS.card;

/** Lê a largura real do arquivo decodificando-o no navegador — o único jeito de saber a
 *  resolução de uma foto antes de subi-la, já que nem `File` nem seu `type`/`size` carregam
 *  essa informação. */
export function meetsMinimumWidth(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img.naturalWidth >= MIN_UPLOAD_WIDTH);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Arquivo que o navegador não consegue decodificar como imagem: não é o problema que
      // esta checagem existe pra pegar, e `isImageFile` já filtrou o que dava pra filtrar
      // pelo tipo declarado.
      resolve(true);
    };
    img.src = objectUrl;
  });
}
