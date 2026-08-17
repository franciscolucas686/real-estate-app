/**
 * Gera **todo** ícone e logo do app a partir de `assets/logo-source.png`.
 *
 *   npm run icons
 *
 * Existe porque a geração anterior era um site externo (realfavicongenerator): trocar a logo
 * significava lembrar de dez arquivos e de um serviço que ninguém tinha aberto em meses. Pior,
 * aquela passada **achatou o alpha de todos eles sobre branco** — e o arquivo de origem se chama
 * "sem fundo" justamente porque o fundo não deveria existir. O resultado era um quadrado branco
 * atrás do globo no splash do SO, na dock, na barra de tarefas e na tela de login, todos
 * desenhados sobre o `--color-background` `#f0f1f5` do app.
 *
 * A regra que organiza o arquivo inteiro: **transparência é o padrão, e opacidade é a exceção
 * que precisa de justificativa por destino.** São só duas:
 *
 *   - `apple-touch-icon` — o iOS compõe alpha sobre **preto** e aplica o arredondamento dele por
 *     cima. Um ícone com alpha sai com fundo preto, não com o fundo da tela.
 *   - `maskable` — o Android recorta o ícone na máscara dele (círculo, squircle, gota) e pode
 *     comer até 20% de cada borda. Sem chapa opaca sob a arte, o recorte mostra o que estiver
 *     atrás.
 *
 * Todo o resto — os ícones `any` do manifest, os favicons e a logo que o app desenha em React —
 * preserva o alpha, e é isso que faz o globo ler como círculo sobre qualquer superfície.
 */
import { Buffer } from 'node:buffer';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets', 'logo-source.png');
const PUBLIC = join(ROOT, 'public');
const ICONS = join(PUBLIC, 'icons');

/** A chapa das duas exceções acima. Branco porque o oceano do globo é azul-escuro: sobre
 *  `#f0f1f5` ou sobre o `theme_color` `#00072D` a silhueta circular se dissolve no fundo. */
const PLATE = '#ffffff';

/** A máscara do Android garante só os 80% centrais. É a safe zone, não uma margem estética. */
const MASKABLE_SCALE = 0.8;

/** O iOS aplica a superelipse dele por cima, e o globo encosta na borda do quadrado de origem. */
const APPLE_SCALE = 0.94;

/** Abaixo disto o downscale de arte fotográfica vira borrão e precisa de sharpen. Vale saber que
 *  isto tem teto na própria arte: um globo fotográfico a 16px é um disco azul, com ou sem filtro. */
const SHARPEN_BELOW = 128;

const png = (pipeline) => pipeline.png({ compressionLevel: 9, effort: 10 });

/** Redimensiona preservando alpha. `fit: 'contain'` com fundo transparente é redundante para uma
 *  origem quadrada, mas mantém o comportamento correto se a arte deixar de ser 1:1. */
function scaled(size) {
  const pipeline = sharp(SRC).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    kernel: 'lanczos3',
  });
  return size < SHARPEN_BELOW ? pipeline.sharpen({ sigma: 0.5 }) : pipeline;
}

/** A arte reduzida a `scale` e assentada no centro de uma chapa opaca. `channels: 3` é o que
 *  garante que a saída não tem canal alpha nenhum para o iOS compor sobre preto. */
async function onPlate(size, scale) {
  const inner = Math.round(size * scale);
  const art = await scaled(inner).toBuffer();
  return png(
    sharp({
      create: { width: size, height: size, channels: 3, background: PLATE },
    }).composite([{ input: art, gravity: 'center' }]),
  ).toBuffer();
}

/**
 * Monta um `.ico` à mão: ICONDIR (6 bytes) + um ICONDIRENTRY (16 bytes) por tamanho + os PNGs
 * concatenados. O `sharp` não escreve ICO, e o formato é simples o bastante para não valer uma
 * dependência nativa a mais só por ele. PNG embutido (não BMP) é suportado desde o Vista e é o
 * que mantém o alpha.
 */
async function buildIco(sizes) {
  const images = await Promise.all(sizes.map((size) => png(scaled(size)).toBuffer()));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo 1 = ícone
  header.writeUInt16LE(sizes.length, 4);

  let offset = header.length + sizes.length * 16;
  const entries = sizes.map((size, i) => {
    const entry = Buffer.alloc(16);
    // 0 significa 256 neste campo de um byte. Nenhum tamanho aqui chega lá, mas escrever a regra
    // é mais barato que descobrir o truncamento silencioso depois.
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // paleta: 0 = sem paleta
    entry[3] = 0; // reservado
    entry.writeUInt16LE(1, 4); // planos de cor
    entry.writeUInt16LE(32, 6); // bits por pixel
    entry.writeUInt32LE(images[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += images[i].length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images]);
}

async function emit(path, data) {
  await writeFile(path, data);
  const rel = path.slice(ROOT.length + 1);
  console.log(`  ${rel.padEnd(34)} ${(data.length / 1024).toFixed(0).padStart(4)} KB`);
}

async function main() {
  // Apagados e refeitos por inteiro: um diretório que só recebe arquivos acumula o resíduo da
  // geração anterior, e um ícone órfão continua sendo servido por quem já tem o caminho antigo.
  await rm(ICONS, { recursive: true, force: true });
  await rm(join(PUBLIC, 'favicon.ico'), { force: true });
  await mkdir(ICONS, { recursive: true });

  console.log(`gerando a partir de ${SRC.slice(ROOT.length + 1)}\n`);

  // Ícones `any` do manifest. Transparentes: é esta arte que o Android e o iOS 15.4+ centralizam
  // sobre `background_color` na splash que eles geram sozinhos, e que o Windows e o macOS
  // desenham na barra de tarefas e na dock.
  for (const size of [192, 512]) {
    await emit(join(ICONS, `icon-${size}.png`), await png(scaled(size)).toBuffer());
  }

  // Ícones `maskable`. Ver o comentário de PLATE/MASKABLE_SCALE acima.
  for (const size of [192, 512]) {
    await emit(join(ICONS, `maskable-${size}.png`), await onPlate(size, MASKABLE_SCALE));
  }

  await emit(join(ICONS, 'apple-touch-icon.png'), await onPlate(180, APPLE_SCALE));

  await emit(join(ICONS, 'favicon-96.png'), await png(scaled(96)).toBuffer());

  // Na raiz, não em `icons/`: o navegador pede `/favicon.ico` sozinho quando nenhum `<link>`
  // serve, e num SPA com fallback esse pedido voltava `index.html` com status 200.
  await emit(join(PUBLIC, 'favicon.ico'), await buildIco([16, 32, 48]));

  // A escada que `ui/splash-screen.tsx` e `pages/login.tsx` consomem via `srcSet`. WebP lossy
  // **com** alpha — o formato sempre suportou (chunk ALPH); o que a passada anterior fazia era
  // achatar antes de codificar. `alphaQuality: 100` mantém a borda do globo limpa, que é onde um
  // alpha comprimido apareceria como halo.
  //
  // O degrau de 128 não pertence a essa escada: ele existe para os brand marks das duas navs
  // (`BrandMark` em `layout/app-nav.tsx`), que são de 28px e 40px e portanto precisam de 120px
  // no pior caso, DPR 3. Eles o consomem por `src` direto, sem `srcSet` — a topbar aparece em
  // toda página da vitrine, e um arquivo cacheado vale mais que três alternativas.
  for (const size of [128, 384, 576, 1024]) {
    await emit(
      join(ICONS, `logo-${size}.webp`),
      await sharp(SRC)
        .resize(size, size, { kernel: 'lanczos3' })
        .webp({ quality: 82, alphaQuality: 100, effort: 6 })
        .toBuffer(),
    );
  }
}

await main();
