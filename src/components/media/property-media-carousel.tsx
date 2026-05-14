import { twMerge } from 'tailwind-merge';
import type { PropertyImageDto } from '../../types/api';
import { Carousel } from '../ui/carousel';

interface PropertyMediaCarouselProps {
  images: PropertyImageDto[];
  className?: string;
  onOpenGallery?: () => void;
  showDots?: boolean;
}

export function PropertyMediaCarousel({
  images,
  className,
  onOpenGallery,
  showDots = true,
}: PropertyMediaCarouselProps) {
  if (images.length === 0) {
    return (
      <div
        className={twMerge(
          'flex aspect-4/3 w-full items-center justify-center bg-border',
          className,
        )}
      >
        <span className="text-sm text-muted-foreground">Sem fotos</span>
      </div>
    );
  }

  return (
    <div data-slot="property-media-carousel" className={twMerge('relative w-full', className)}>
      <Carousel showDots={showDots}>
        {images.map((img, i) => (
          <img
            key={img.id}
            src={img.url}
            alt={img.label ?? `Foto ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            draggable={false}
            onClick={onOpenGallery}
            className={twMerge(
              'aspect-4/3.5 w-full object-cover',
              onOpenGallery && 'cursor-pointer',
            )}
          />
        ))}
      </Carousel>

      {onOpenGallery && images.length > 1 && (
        <button
          type="button"
          onClick={onOpenGallery}
          className="absolute bottom-10 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
        >
          Ver todas ({images.length})
        </button>
      )}
    </div>
  );
}
