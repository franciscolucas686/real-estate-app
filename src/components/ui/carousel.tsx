import { twMerge } from 'tailwind-merge';
import { type ComponentProps, type ReactNode } from 'react';
import { useCarouselSwipe } from '../../hooks/use-carousel-swipe';

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
    <div data-slot="carousel" className={twMerge('flex flex-col gap-2', className)} {...props}>
      <div ref={containerRef} className="overflow-hidden">
        <div
          data-slot="carousel-track"
          className={twMerge(
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
