import { useState, useEffect } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { twMerge } from 'tailwind-merge';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PropertyImageDto } from '../../types/api';

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
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Preload adjacent images
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
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(images.length - 1, c + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  const img = images[current];

  return (
    <motion.div
      data-slot="property-media-viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={twMerge('fixed inset-0 z-100 flex flex-col bg-black', className)}
      {...props}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white active:scale-90 transition-transform"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-12">
        <img
          src={img.url}
          alt={img.label ?? `Foto ${current + 1}`}
          loading="eager"
          draggable={false}
          className="max-h-[75dvh] w-full object-contain"
        />
      </div>

      {/* Side navigation */}
      {current > 0 && (
        <button
          type="button"
          onClick={() => setCurrent((c) => c - 1)}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white active:scale-90 transition-transform"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {current < images.length - 1 && (
        <button
          type="button"
          onClick={() => setCurrent((c) => c + 1)}
          aria-label="Próxima"
          className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white active:scale-90 transition-transform"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2">
        <span className="text-sm text-white/70 line-clamp-1">{img.label ?? ''}</span>
        <span className="shrink-0 text-sm text-white/70">
          {current + 1}/{images.length}
        </span>
      </div>
    </motion.div>
  );
}
