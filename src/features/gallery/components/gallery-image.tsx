import { Check, Star } from 'lucide-react';
import { cn } from '@/shared/cn';
import { imageUrl } from '@/shared/image-url';
import { useLongPress } from '@/shared/hooks/use-long-press';
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
   * Alterna a foto principal do imóvel. Presente só onde a galeria é editável — é ela que
   * liga tanto o overlay de desktop quanto a ação da folha aberta pelo toque longo.
   */
  onToggleMain?: (imageId: string) => void;
  /**
   * Abre a folha de ações desta foto. Chamada pelo toque longo, que é o caminho do celular:
   * lá não há hover para revelar o overlay.
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
  // Desligado em modo de seleção: ali o toque pertence ao checkbox, e abrir uma folha no meio
  // de uma seleção múltipla seria uma segunda coisa acontecendo no mesmo gesto.
  const longPressProps = useLongPress({
    enabled: !selecting && Boolean(onRequestActions),
    onLongPress: () => onRequestActions?.(image.id),
  });

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
      <div className={cn('group relative aspect-square', className)} {...longPressProps}>
        {figure}
        {onToggleMain && (
          /*
           * Só a partir de `md`. Abaixo disso não há hover que o revele, e o caminho do
           * celular é o toque longo — deixá-lo montado e invisível daria um botão que
           * responde a um toque que ninguém vê.
           *
           * `group-focus-within` acompanha o `group-hover` pelo mesmo motivo que nas setas do
           * carrossel: sem ele o botão existe para o teclado mas nunca aparece.
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
              'md:flex md:group-hover:opacity-100 md:group-focus-within:opacity-100',
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
