import { cn } from '@/shared/cn';
import type { PropertyImageDto } from '@/shared/api/types';
import type { JSX } from 'react';

interface PropertyMediaGalleryProps {
  images: PropertyImageDto[];
  onImageClick?: (index: number) => void;
  className?: string;
}

export function PropertyMediaGallery({
  images,
  onImageClick,
  className,
}: PropertyMediaGalleryProps) {
  if (images.length === 0) return null;

  const blocks: JSX.Element[] = [];
  let idx = 0;
  let blockNum = 0;

  while (idx < images.length) {
    const isEven = blockNum % 2 === 0;

    // 1. Full-width image
    if (idx < images.length) {
      const img = images[idx];
      const capturedIdx = idx;
      blocks.push(
        <div key={`full-${blockNum}-0`} className="w-full">
          <img
            src={img.url}
            alt={img.label ?? `Foto ${capturedIdx + 1}`}
            loading="lazy"
            draggable={false}
            onClick={() => onImageClick?.(capturedIdx)}
            className="aspect-16/10 w-full cursor-pointer object-cover"
          />
        </div>,
      );
      idx++;
    }

    // 2. Two-column grid block
    const leftImages: PropertyImageDto[] = [];
    const leftIdxs: number[] = [];
    const rightImages: PropertyImageDto[] = [];
    const rightIdxs: number[] = [];

    if (isEven) {
      // col A = 1 image, col B = 2 images
      if (idx < images.length) {
        leftImages.push(images[idx]);
        leftIdxs.push(idx);
        idx++;
      }
      if (idx < images.length) {
        rightImages.push(images[idx]);
        rightIdxs.push(idx);
        idx++;
      }
      if (idx < images.length) {
        rightImages.push(images[idx]);
        rightIdxs.push(idx);
        idx++;
      }
    } else {
      // col A = 2 images, col B = 1 image
      if (idx < images.length) {
        leftImages.push(images[idx]);
        leftIdxs.push(idx);
        idx++;
      }
      if (idx < images.length) {
        leftImages.push(images[idx]);
        leftIdxs.push(idx);
        idx++;
      }
      if (idx < images.length) {
        rightImages.push(images[idx]);
        rightIdxs.push(idx);
        idx++;
      }
    }

    if (leftImages.length > 0 || rightImages.length > 0) {
      blocks.push(
        <div key={`grid-${blockNum}`} className="grid grid-cols-2 gap-2">
          {/* Left column */}
          <div className={cn('flex flex-col gap-2', leftImages.length === 1 && 'justify-center')}>
            {leftImages.map((img, li) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.label ?? `Foto ${leftIdxs[li] + 1}`}
                loading="lazy"
                draggable={false}
                onClick={() => onImageClick?.(leftIdxs[li])}
                className={cn(
                  'w-full cursor-pointer object-cover',
                  leftImages.length === 1 ? 'aspect-square' : 'aspect-square',
                )}
              />
            ))}
          </div>
          {/* Right column */}
          <div className={cn('flex flex-col gap-2', rightImages.length === 1 && 'justify-center')}>
            {rightImages.map((img, ri) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.label ?? `Foto ${rightIdxs[ri] + 1}`}
                loading="lazy"
                draggable={false}
                onClick={() => onImageClick?.(rightIdxs[ri])}
                className={cn(
                  'w-full cursor-pointer object-cover',
                  rightImages.length === 1 ? 'aspect-square' : 'aspect-square',
                )}
              />
            ))}
          </div>
        </div>,
      );
    }

    blockNum++;
  }

  return (
    <div data-slot="property-media-gallery" className={cn('flex flex-col gap-2', className)}>
      {blocks}
    </div>
  );
}
