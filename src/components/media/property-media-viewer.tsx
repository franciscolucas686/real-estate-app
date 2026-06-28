import { useEffect } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { twMerge } from 'tailwind-merge';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PropertyImageDto } from '../../types/api';
import { useCarouselSwipe } from '../../hooks/use-carousel-swipe';
import { useScrollLock } from '../../hooks/use-scroll-lock';

interface PropertyMediaViewerProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  images: PropertyImageDto[];
  initialIndex?: number;
  onClose: () => void;
}

export function PropertyMediaViewer({
  images,
  initialIndex = 0,
  onClose,
  className,
  ...props
}: PropertyMediaViewerProps) {
  const { current, isDragging, containerRef, translateX, snapTo, trackHandlers } = useCarouselSwipe(
    { totalSlides: images.length, initialIndex },
  );

  useScrollLock(true);

  useEffect(() => {
    [current - 1, current + 1]
      .filter((i) => i >= 0 && i < images.length)
      .forEach((i) => {
        const img = new Image();
        img.src = images[i].url;
      });
  }, [current, images]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') snapTo(current - 1);
      if (e.key === 'ArrowRight') snapTo(current + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, onClose, snapTo]);

  const img = images[current];

  return (
    <motion.div
      data-slot="property-media-viewer"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 40, stiffness: 400 }}
      className={twMerge('fixed inset-0 z-100 flex flex-col bg-black', className)}
      {...props}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-transform active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image track — 8px margin each side via px-2 per slide */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <div
          className={twMerge(
            'flex h-full select-none',
            !isDragging && 'transition-transform duration-300 ease-out',
          )}
          style={{ transform: `translateX(${translateX}px)` }}
          {...trackHandlers}
        >
          {images.map((slide, i) => (
            <div
              key={slide.id}
              className="flex h-full w-full shrink-0 items-center justify-center px-2"
            >
              <img
                src={slide.url}
                alt={slide.label ?? `Foto ${i + 1}`}
                loading={i === current ? 'eager' : 'lazy'}
                draggable={false}
                className="max-h-[75dvh] w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Side navigation */}
      {current > 0 && (
        <button
          type="button"
          onClick={() => snapTo(current - 1)}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-transform active:scale-90"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {current < images.length - 1 && (
        <button
          type="button"
          onClick={() => snapTo(current + 1)}
          aria-label="Próxima"
          className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-transform active:scale-90"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <span className="text-sm text-white/70 line-clamp-1 ">{img.roomName ?? ''}</span>
        <span className="shrink-0 text-sm text-white/70">
          {current + 1}/{images.length}
        </span>
      </div>
    </motion.div>
  );
}
