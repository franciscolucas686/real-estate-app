import { twMerge } from 'tailwind-merge';
import { useState, useRef, useEffect, type ComponentProps, type ReactNode } from 'react';

const DEFAULT_GAP = 8;
const SWIPE_THRESHOLD_RATIO = 0.25;
const VELOCITY_THRESHOLD = 0.5;

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
  gap = DEFAULT_GAP,
  showDots = true,
  initialIndex = 0,
  onSlideChange,
  ...props
}: CarouselProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startTime = useRef(0);
  const totalSlides = children.length;

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setSlideWidth(containerRef.current.offsetWidth);
      }
    }
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const translateX = -(current * (slideWidth + gap)) + dragOffset;

  function snapTo(index: number) {
    const clamped = Math.max(0, Math.min(index, totalSlides - 1));
    setCurrent(clamped);
    setDragOffset(0);
    setIsDragging(false);
    onSlideChange?.(clamped);
  }

  function handleTouchStart(e: React.TouchEvent) {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    startTime.current = Date.now();
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX.current;
    setDragOffset(diff);
  }

  function handleTouchEnd() {
    if (!isDragging) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const velocity = Math.abs(dragOffset) / elapsed;
    const threshold = slideWidth * SWIPE_THRESHOLD_RATIO;

    let next = current;
    if (Math.abs(dragOffset) > threshold || velocity > VELOCITY_THRESHOLD * slideWidth) {
      next = dragOffset < 0 ? current + 1 : current - 1;
    }

    snapTo(next);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return;
    setIsDragging(true);
    startX.current = e.clientX;
    startTime.current = Date.now();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || e.pointerType === 'touch') return;
    const diff = e.clientX - startX.current;
    setDragOffset(diff);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return;
    if (!isDragging) return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    const velocity = Math.abs(dragOffset) / elapsed;
    const threshold = slideWidth * SWIPE_THRESHOLD_RATIO;

    let next = current;
    if (Math.abs(dragOffset) > threshold || velocity > VELOCITY_THRESHOLD * slideWidth) {
      next = dragOffset < 0 ? current + 1 : current - 1;
    }

    snapTo(next);
  }

  return (
    <div data-slot="carousel" className={twMerge('flex flex-col gap-2', className)} {...props}>
      <div ref={containerRef} className="overflow-hidden rounded-xl">
        <div
          data-slot="carousel-track"
          className={twMerge(
            'flex select-none',
            !isDragging && 'transition-transform duration-300 ease-out',
          )}
          style={{
            gap: `${gap}px`,
            transform: `translateX(${translateX}px)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {children.map((child, i) => (
            <div key={i} data-slot="carousel-slide" className="w-full shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>
      {showDots && totalSlides > 1 && (
        <div data-slot="carousel-dots" className="flex justify-center gap-1.5 py-1">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              data-active={i === current ? '' : undefined}
              className="size-2 rounded-full bg-foreground/40 transition-colors data-active:bg-foreground"
              onClick={() => snapTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
