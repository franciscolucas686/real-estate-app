import { cn } from '@/shared/cn';
import { useNavigate } from 'react-router-dom';
import { Carousel } from '@/ui/carousel';
import type { PropertyCardDto } from '@/shared/api/types';
import { BusinessType } from '@/shared/api/types';
import { formatMainPrice, PropertyTypeLabel, BusinessTypeLabel } from '@/shared/format';
import { Bed, Bath, Car } from 'lucide-react';

interface PropertyCardProps {
  property: PropertyCardDto;
  className?: string;
}

export function PropertyCard({ property, className }: PropertyCardProps) {
  const navigate = useNavigate();

  const hasImages = property.previewImages.length > 0;

  return (
    <article
      data-slot="property-card"
      className={cn(
        '@container w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm transition-[transform,box-shadow,border-color] active:scale-[0.99] md:hover:border-foreground-subtle/30 md:hover:shadow-md',
        className,
      )}
      onClick={() => navigate(`/properties/${property.id}`)}
    >
      {/* Image carousel — full width, no padding */}
      <div className="relative">
        {hasImages ? (
          // No arrows: the card's photo is a preview, and the whole card is a click target
          // leading to the property. Swiping, the dots and the arrow keys still page it.
          <Carousel showArrows={false}>
            {property.previewImages.map((img, i) => (
              <img
                key={img.id}
                src={img.url}
                alt={`${PropertyTypeLabel[property.type]} ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                className="aspect-16/10 w-full object-cover"
              />
            ))}
          </Carousel>
        ) : (
          <div className="flex aspect-16/10 w-full items-center justify-center bg-border">
            <span className="text-sm text-muted-foreground">Sem fotos</span>
          </div>
        )}

        {/* Business type badge */}
        <span
          className={cn(
            'absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white',
            property.businessType === BusinessType.SALE ? 'bg-action' : 'bg-accent',
          )}
        >
          {BusinessTypeLabel[property.businessType]}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        {/* Type */}
        <span className="text-muted-foreground uppercase tracking-wide">
          {PropertyTypeLabel[property.type]}
        </span>

        {/* Price */}
        <span className="text-xl font-bold text-foreground">
          {formatMainPrice(property.businessType, property.price, property.rentPrice)}
        </span>

        {/* Specs */}
        {(property.bedrooms || property.bathrooms || property.parkingSpaces) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-bold text-sm text-foreground-subtle">
            {/* Icon + number + name always show together — tight gaps (both between specs
                and inside each one) buy back the room the icons need. `flex-wrap` is the
                backstop: if a spec still doesn't fit (long numbers, a user font-size
                override), it drops to its own line instead of being clipped by the card's
                `overflow-hidden`. */}
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <Bed size={18} />
                {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath size={18} />
                {property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}
              </span>
            )}
            {property.parkingSpaces != null && (
              <span className="flex items-center gap-1">
                <Car size={18} />
                {property.parkingSpaces} {property.parkingSpaces === 1 ? 'Vaga' : 'Vagas'}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        <span className="text-sm text-muted-foreground">
          {property.neighborhood} · {property.city}, {property.state}
        </span>
      </div>
    </article>
  );
}
