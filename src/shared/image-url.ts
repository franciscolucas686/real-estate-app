/**
 * Redimensionamento de imagem na borda, via Cloudflare.
 *
 * O backend guarda **uma** versão de cada foto, em 1920×1080. Isso é o que o
 * visualizador em tela cheia precisa e é desperdício em todo o resto: um card de
 * listagem ocupa ~400px de largura e baixava os mesmos ~350KB, o que numa página de
 * 12 cards dá ~4MB no 4G do cliente para exibir miniaturas.
 *
 * A alternativa seria gerar variantes no upload, mas isso custaria migração de
 * schema, três chaves por foto nos caminhos de deletar/mover/restaurar do R2, e não
 * valeria para nenhuma foto já existente. Redimensionar na borda resolve os três
 * pontos de uma vez, inclusive retroativamente.
 *
 * **Inerte por padrão.** Sem `VITE_IMAGE_CDN=true` devolve a URL intacta, que é o
 * comportamento certo em desenvolvimento: lá as imagens vêm do MinIO em
 * `localhost:9000`, onde `/cdn-cgi/` não existe e todo `<img>` quebraria. Só ligue
 * a flag depois que o bucket estiver atrás de um domínio na Cloudflare com
 * transformações habilitadas — é uma configuração de infra, não de código.
 */
const ENABLED = import.meta.env.VITE_IMAGE_CDN === 'true';

/**
 * Larguras nomeadas pelo uso, não pelo número — o call site descreve a intenção.
 *
 * Os valores são **pixels físicos**, e é por isso que parecem grandes demais para o
 * espaço que ocupam: um card de listagem mede ~390 CSS px na largura de um celular,
 * mas numa tela de DPR 3 isso são ~1170 px reais. Dimensionar pelo tamanho em CSS
 * entregaria foto de imóvel visivelmente borrada — que é pior que foto pesada, e o
 * tipo de regressão que ninguém percebe no monitor do desenvolvedor.
 *
 * Mesmo generosos, o ganho é grande: o original de 1920px tem ~350KB, e `thumb`
 * fica em ~110KB antes do `format=auto`, que ainda corta boa parte disso servindo
 * WebP/AVIF. Numa listagem de 12 cards, ~4MB viram algo perto de 1MB.
 */
export const IMAGE_WIDTHS = {
  /** Cards de listagem e tiras de miniatura — nunca ocupam a tela inteira. */
  thumb: 800,
  /** Carrossel e foto principal do detalhe, que ocupam a largura toda. */
  card: 1600,
} as const;

export type ImageWidth = keyof typeof IMAGE_WIDTHS;

/**
 * URL da foto na largura pedida. Omitir `width` devolve o original — é o que o
 * visualizador em tela cheia quer, e o default seguro para qualquer call site novo.
 *
 * `format=auto` deixa a Cloudflare servir WebP/AVIF para quem aceita, o que costuma
 * valer mais que o próprio redimensionamento em foto de imóvel.
 */
export function imageUrl(url: string, width?: ImageWidth): string {
  if (!ENABLED || !width) return url;

  try {
    const parsed = new URL(url);
    const options = `width=${IMAGE_WIDTHS[width]},quality=80,format=auto`;
    return `${parsed.origin}/cdn-cgi/image/${options}${parsed.pathname}${parsed.search}`;
  } catch {
    // URL relativa ou malformada: devolve intacta em vez de quebrar a imagem.
    // Não deveria acontecer — o backend sempre grava URL absoluta —, mas uma foto
    // que não carrega é pior do que uma foto grande demais.
    return url;
  }
}
