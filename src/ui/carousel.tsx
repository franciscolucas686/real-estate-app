import { cn } from '@/shared/cn';
import { type ComponentProps, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarouselSwipe } from '@/shared/hooks/use-carousel-swipe';

export interface CarouselProps extends ComponentProps<'div'> {
  children: ReactNode[];
  gap?: number;
  showDots?: boolean;
  initialIndex?: number;
  onSlideChange?: (index: number) => void;
}

export function Carousel({
  children,
  className,
  gap = 0,
  showDots = true,
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

        {/* Hover/focus-revealed prev/next — desktop only, mouse-drag/swipe already covers touch */}
        {totalSlides > 1 && current > 0 && (
          <button
            type="button"
            onClick={() => snapTo(current - 1)}
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity md:flex md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:hover:bg-black/60"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {totalSlides > 1 && current < totalSlides - 1 && (
          <button
            type="button"
            onClick={() => snapTo(current + 1)}
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity md:flex md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:hover:bg-black/60"
          >
            <ChevronRight size={18} />
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
              onClick={() => snapTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
