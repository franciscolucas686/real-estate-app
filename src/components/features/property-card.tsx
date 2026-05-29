import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';
import { Carousel } from '../ui/carousel';
import type { PropertyCardDto } from '../../types/api';
import { BusinessType } from '../../types/api';
import { formatMainPrice, PropertyTypeLabel, BusinessTypeLabel } from '../../utils/format';
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
      className={twMerge(
        'w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm active:scale-[0.99] transition-transform',
        className,
      )}
      onClick={() => navigate(`/properties/${property.id}`)}
    >
      {/* Image carousel — full width, no padding */}
      <div className="relative">
        {hasImages ? (
          <Carousel>
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
          className={twMerge(
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
          <div className="flex items-center gap-5 font-bold text-sm text-foreground-subtle">
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
