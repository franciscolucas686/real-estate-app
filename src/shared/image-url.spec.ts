import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL = 'https://fotos.exemplo.com/prop-1/abc.jpg';

/**
 * O módulo lê a flag uma vez, no carregamento, então cada cenário precisa de uma
 * instância limpa — daí `resetModules` + import dinâmico em vez de import estático.
 */
async function load(enabled: boolean) {
  vi.stubEnv('VITE_IMAGE_CDN', enabled ? 'true' : '');
  vi.resetModules();
  return import('@/shared/image-url');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('imageUrl', () => {
  it('devolve a URL intacta quando o CDN está desligado', async () => {
    const { imageUrl } = await load(false);

    // O caso de desenvolvimento: as imagens vêm do MinIO, onde /cdn-cgi/ não existe.
    // Reescrever ali quebraria toda foto da aplicação local.
    expect(imageUrl(ORIGINAL, 'thumb')).toBe(ORIGINAL);
  });

  it('reescreve para a largura pedida quando ligado', async () => {
    const { imageUrl } = await load(true);

    expect(imageUrl(ORIGINAL, 'thumb')).toBe(
      'https://fotos.exemplo.com/cdn-cgi/image/width=800,quality=80,format=auto/prop-1/abc.jpg',
    );
    expect(imageUrl(ORIGINAL, 'card')).toBe(
      'https://fotos.exemplo.com/cdn-cgi/image/width=1600,quality=80,format=auto/prop-1/abc.jpg',
    );
  });

  it('sem largura devolve o original mesmo ligado — é o que a tela cheia quer', async () => {
    const { imageUrl } = await load(true);

    expect(imageUrl(ORIGINAL)).toBe(ORIGINAL);
  });

  it('URL malformada passa intacta em vez de quebrar a imagem', async () => {
    const { imageUrl } = await load(true);

    expect(imageUrl('/caminho/relativo.jpg', 'thumb')).toBe('/caminho/relativo.jpg');
    expect(imageUrl('', 'thumb')).toBe('');
  });

  it('preserva a query string da URL original', async () => {
    const { imageUrl } = await load(true);

    expect(imageUrl(`${ORIGINAL}?v=2`, 'thumb')).toBe(
      'https://fotos.exemplo.com/cdn-cgi/image/width=800,quality=80,format=auto/prop-1/abc.jpg?v=2',
    );
  });
});
