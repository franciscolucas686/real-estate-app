import { Check } from 'lucide-react';
import { cn } from '@/shared/cn';
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
  className,
}: GalleryImageProps) {
  const figure = (
    <>
      <img
        src={image.url}
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
    </>
  );

  if (!selecting) {
    return <div className={cn('relative aspect-square', className)}>{figure}</div>;
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
