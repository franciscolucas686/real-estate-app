import { tv, type VariantProps } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
import { Carousel } from '../ui/carousel';

const propertyCardVariants = tv({
  base: 'flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg',
  variants: {
    size: {
      sm: 'max-w-[300px]',
      md: 'max-w-[380px]',
      lg: 'max-w-[430px]',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface PropertyCardProps
  extends ComponentProps<'article'>, VariantProps<typeof propertyCardVariants> {
  images: [string, string, string, string];
  propertyType: string;
  price: number;
  monthlyFees?: string;
  area: number;
  bedrooms: number;
  parkingSpots: number;
  address: string;
  city: string;
}

export function PropertyCard({
  className,
  size,
  images,
  propertyType,
  price,
  monthlyFees,
  area,
  bedrooms,
  parkingSpots,
  address,
  city,
  ...props
}: PropertyCardProps) {
  return (
    <article
      data-slot="property-card"
      className={twMerge(propertyCardVariants({ size }), className)}
      {...props}
    >
      <PropertyCardImage images={images} alt={propertyType} />
      <PropertyCardBody>
        <PropertyCardPricing propertyType={propertyType} price={price} monthlyFees={monthlyFees} />
        <PropertyCardFeatures area={area} bedrooms={bedrooms} parkingSpots={parkingSpots} />
        <PropertyCardLocation address={address} city={city} />
      </PropertyCardBody>
    </article>
  );
}

function PropertyCardImage({
  images,
  alt,
  className,
}: {
  images: [string, string, string, string];
  alt: string;
  className?: string;
}) {
  return (
    <div data-slot="property-card-image" className={twMerge('p-3 pb-0', className)}>
      <Carousel>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            loading="lazy"
            draggable={false}
            className="aspect-16/10 w-full rounded-xl object-cover"
          />
        ))}
      </Carousel>
    </div>
  );
}

function PropertyCardBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="property-card-body"
      className={twMerge('flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

function PropertyCardPricing({
  propertyType,
  price,
  monthlyFees,
}: {
  propertyType: string;
  price: number;
  monthlyFees?: string;
}) {
  return (
    <div data-slot="property-card-pricing" className="flex flex-col gap-0.5">
      <span className="text-sm text-foreground-subtle">{propertyType}</span>
      <span className="text-xl font-bold text-foreground">R$ {price.toLocaleString('pt-BR')}</span>
      {monthlyFees && <span className="text-sm text-foreground-subtle">{monthlyFees}</span>}
    </div>
  );
}

function PropertyCardFeatures({
  area,
  bedrooms,
  parkingSpots,
}: {
  area: number;
  bedrooms: number;
  parkingSpots: number;
}) {
  return (
    <div data-slot="property-card-features" className="flex items-center gap-1.5 text-sm">
      <span className="font-semibold text-foreground">{area}m²</span>
      <span className="text-foreground-subtle">·</span>
      <span className="font-semibold text-foreground">{bedrooms} quartos</span>
      <span className="text-foreground-subtle">·</span>
      <span className="font-semibold text-foreground">{parkingSpots} vaga</span>
    </div>
  );
}

function PropertyCardLocation({ address, city }: { address: string; city: string }) {
  return (
    <div
      data-slot="property-card-location"
      className="flex items-center gap-1.5 text-sm text-foreground-subtle"
    >
      <span>{address}</span>
      <span>·</span>
      <span>{city}</span>
    </div>
  );
}
