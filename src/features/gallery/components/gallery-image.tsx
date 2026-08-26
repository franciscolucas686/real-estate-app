import { Check, Star } from 'lucide-react';
import { cn } from '@/shared/cn';
import { imageUrl } from '@/shared/image-url';
import type { PropertyImageDto } from '@/shared/api/types';

interface GalleryImageProps {
  image: PropertyImageDto;
  /** 1-based position, for the accessible name. */
  position: number;
  /**
   * Render as a `role="checkbox"` instead of a plain tile.
   *
   * A boolean rather than the page-wide `mode` this used to take: `mode` was threaded into
   * `RoomSection` as well, so entering selection inside the room view would have turned the
   * page's stacked tiles into checkboxes too, putting two elements named "Foto 1 — Frente" in
   * the DOM at once. `RoomSection` has no way to pass this, so that cannot come back by
   * accident — which is what keeps the spec's singular `getByRole` queries meaningful.
   */
  selecting?: boolean;
  isSelected?: boolean;
  onToggle?: (imageId: string) => void;
  /**
   * Alterna a foto principal do imóvel. Presente só onde a galeria é editável, e é ela que o
   * overlay de desktop chama — no celular quem chama é a folha, com a mesma função.
   */
  onToggleMain?: (imageId: string) => void;
  /**
   * Abre a folha de ações desta foto. É o caminho do celular, onde não há hover para revelar
   * o overlay: um toque na foto basta.
   */
  onRequestActions?: (imageId: string) => void;
  /** Responsive visibility classes from the parent grid (`photoTileVisibility`). */
  className?: string;
}

/**
 * A photo in the gallery grid — and, in selection mode, a real checkbox.
 *
 * It used to be a plain `<div>` with an `<img>`: selection happened entirely through
 * pointer events captured by `useSwipeToSelect` on the container. That meant three
 * failures at once. There was no way to select a photo with a keyboard (WCAG 2.1.1),
 * nothing announced that a photo *could* be selected or that it *was* (no role, no
 * `aria-checked`), and drag was the only path to multi-select (WCAG 2.5.7 asks for a
 * single-pointer alternative — tap worked, but nothing said so).
 *
 * The swipe gesture is kept: dragging across a dozen photos is genuinely faster than
 * twelve taps. It is now an accelerator on top of an accessible control rather than the
 * only way in. `data-swipe-select-id` is what the gesture handler looks for, so the
 * attribute stays.
 */
export function GalleryImage({
  image,
  position,
  selecting = false,
  isSelected = false,
  onToggle,
  onToggleMain,
  onRequestActions,
  className,
}: GalleryImageProps) {
  /*
   * A estrela fica no canto **direito**: o esquerdo é da bolha de seleção, e as duas aparecem
   * juntas quando se seleciona fotos num imóvel que já tem principal.
   *
   * Persistente de propósito, sem depender de hover — é a identificação visual de qual foto é
   * a capa, e ela precisa estar legível numa varredura da grade inteira.
   */
  const mainBadge = image.isMain && (
    <span
      // Sobre fotografia, os literais `bg-black/…` e `text-white` são a exceção sancionada à
      // regra dos tokens: nenhuma cor de tema sobrevive a um fundo arbitrário.
      className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white shadow-md"
      title="Foto principal"
    >
      <Star size={14} fill="currentColor" aria-hidden="true" />
      <span className="sr-only">Foto principal</span>
    </span>
  );

  const figure = (
    <>
      <img
        src={imageUrl(image.url, 'thumb')}
        alt={image.label ?? `Foto ${position}`}
        className={cn(
          'h-full w-full rounded-xl object-cover transition-all',
          isSelected && 'ring-4 ring-action ring-offset-2',
        )}
      />
      {selecting && (
        <span
          aria-hidden="true"
          className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-surface-raised shadow-md"
        >
          {isSelected && (
            <span className="flex size-5 items-center justify-center rounded-full bg-action">
              <Check size={16} className="text-primary-foreground" />
            </span>
          )}
        </span>
      )}
      {mainBadge}
    </>
  );

  if (!selecting) {
    return (
      <div className={cn('group relative aspect-square', className)}>
        {figure}
        {onRequestActions && (
          /*
           * O caminho do celular: um toque abre a folha de ações. Era um toque longo de 2s, que
           * disputava o gesto com o menu nativo de imagem do sistema (salvar, copiar,
           * compartilhar) e por isso nunca teve controle confiável sobre ele.
           *
           * Superfície própria, `md:hidden`, em vez de um `onClick` no tile: acima de `md` o
           * clique na foto tem outro destino (o overlay abaixo alterna a principal direto, sem
           * folha), e este app decide isso por CSS, não por `useIsDesktop`. Mesmo padrão, do
           * lado oposto, de `media-open-viewer` em `property-media-carousel.tsx`.
           */
          <button
            type="button"
            aria-label={`Ações da foto ${position}`}
            onClick={() => onRequestActions(image.id)}
            className="absolute inset-0 cursor-pointer rounded-xl md:hidden"
          />
        )}
        {onToggleMain && (
          /*
           * Só a partir de `md`: abaixo disso não há hover que o revele, e quem responde ao
           * toque é a superfície acima.
           *
           * **Sem `group-focus-within`.** Ele acompanhava o `group-hover`, como nas setas do
           * carrossel, e era o que prendia o overlay: depois de um clique de mouse o botão
           * retém o foco, então `:focus-within` seguia verdadeiro e a foto ficava com o overlay
           * revelado até o foco sair — somando-se ao overlay da foto sob o cursor. O
           * `focus-visible` do próprio botão é o que preserva o teclado, e ele faz a distinção
           * que o `focus-within` não faz: casa com foco por teclado, não com foco por clique.
           */
          <button
            type="button"
            onClick={() => onToggleMain(image.id)}
            aria-label={
              image.isMain
                ? `Remover Foto ${position} como foto principal`
                : `Definir Foto ${position} como foto principal`
            }
            title={image.isMain ? 'Remover como foto principal' : 'Definir como foto principal'}
            className={cn(
              'absolute inset-x-1 bottom-1 hidden items-center justify-center gap-1.5 rounded-lg',
              'bg-black/60 px-2 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity',
              'md:flex md:group-hover:opacity-100',
              'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            <Star size={14} fill={image.isMain ? 'currentColor' : 'none'} aria-hidden="true" />
            <span className="truncate">
              {image.isMain ? 'Foto principal' : 'Definir como principal'}
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Foto ${position}${image.label ? ` — ${image.label}` : ''}`}
      onClick={() => onToggle?.(image.id)}
      data-swipe-select-id={image.id}
      // pan-y lets a vertical drag scroll the page while a horizontal one is claimed by
      // the selection gesture — the same intent detection useSwipeToSelect does in JS.
      style={{ touchAction: 'pan-y' }}
      className={cn(
        'relative aspect-square cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      {figure}
    </button>
  );
}
