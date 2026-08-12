import { cn } from '@/shared/cn';
import { type ComponentProps, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarouselSwipe } from '@/shared/hooks/use-carousel-swipe';

export interface CarouselProps extends ComponentProps<'div'> {
  children: ReactNode[];
  gap?: number;
  showDots?: boolean;
  /**
   * Hover-revealed prev/next buttons. Off for the listing card, where the photo is a
   * preview rather than something to browse in place — swipe, the dots and the arrow keys
   * all still page it.
   */
  showArrows?: boolean;
  initialIndex?: number;
  onSlideChange?: (index: number) => void;
}

/**
 * Every control here stops the click from propagating, and that is load-bearing rather than
 * defensive. The arrows and the dots sit *outside* the track, so the drag-suppression
 * `onClickCapture` in `useCarouselSwipe` — which is on the track — does not cover them, and
 * `PropertyCard` wraps the whole carousel in a clickable `<article>`. Clicking a dot
 * navigated to the property instead of paging the photo. A control that pages should never
 * also trigger whatever sits behind it, so the primitive owns that, not each call site.
 */
function paging(run: () => void) {
  return (e: React.MouseEvent) => {
    e.stopPropagation();
    run();
  };
}

export function Carousel({
  children,
  className,
  gap = 0,
  showDots = true,
  showArrows = true,
  initialIndex = 0,
  onSlideChange,
  ...props
}: CarouselProps) {
  const totalSlides = children.length;
  const { current, isDragging, containerRef, translateX, snapTo, trackHandlers } = useCarouselSwipe(
    { totalSlides, gap, initialIndex, onSlideChange },
  );

  return (
    <div data-slot="carousel" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="group relative">
        <div
          ref={containerRef}
          className="overflow-hidden outline-none"
          tabIndex={totalSlides > 1 ? 0 : undefined}
          role={totalSlides > 1 ? 'group' : undefined}
          aria-label={totalSlides > 1 ? 'Carrossel de imagens' : undefined}
          onKeyDown={(e) => {
            if (totalSlides <= 1) return;
            if (e.key === 'ArrowLeft') snapTo(current - 1);
            if (e.key === 'ArrowRight') snapTo(current + 1);
          }}
        >
          <div
            data-slot="carousel-track"
            className={cn(
              'flex select-none',
              !isDragging && 'transition-transform duration-300 ease-out',
            )}
            style={{ gap: `${gap}px`, transform: `translateX(${translateX}px)` }}
            {...trackHandlers}
          >
            {children.map((child, i) => (
              <div key={i} data-slot="carousel-slide" className="w-full shrink-0">
                {child}
              </div>
            ))}
          </div>
        </div>

        {/* Hover/focus-revealed prev/next — desktop only, mouse-drag/swipe already covers touch.
            `size-11` with a 22px glyph is not a free-hand choice: it is the property detail's
            overlaid back button, which used to sit on the same photo at that size from `md` up and
            has since become mobile-only. These were `p-1.5` around an 18px glyph — a ~30px target,
            well under the 44px that button set beside them. The detail's main photo is the only
            place these render today (`PropertyCard` passes `showArrows={false}`, and
            `PropertyMediaViewer` carries its own arrows), so the size was calibrated against that
            one screen. */}
        {showArrows && totalSlides > 1 && current > 0 && (
          <button
            type="button"
            onClick={paging(() => snapTo(current - 1))}
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity md:flex md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:hover:bg-black/60"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {showArrows && totalSlides > 1 && current < totalSlides - 1 && (
          <button
            type="button"
            onClick={paging(() => snapTo(current + 1))}
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity md:flex md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:hover:bg-black/60"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
      {showDots && totalSlides > 1 && (
        <div data-slot="carousel-dots" className="flex justify-center gap-3 pt-4">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              data-active={i === current ? '' : undefined}
              className="size-2 rounded-full bg-foreground/40 transition-all duration-300 ease-out data-active:scale-125 data-active:bg-foreground"
              onClick={paging(() => snapTo(i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
