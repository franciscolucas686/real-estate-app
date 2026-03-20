import { tv, type VariantProps } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import { MapPin, BedDouble, Bath, CookingPot } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Carousel } from '../ui/carousel';

const propertyCardVariants = tv({
  base: 'flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg',
  variants: {
    size: {
      sm: 'max-w-[300px]',
      md: 'max-w-[360px]',
      lg: 'max-w-[430px]',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface PropertyCardProps
  extends ComponentProps<'article'>, VariantProps<typeof propertyCardVariants> {
  images: [string, string, string, string];
  title: string;
  price: number;
  address: string;
  sqft: number;
  beds: number;
  baths: number;
  kitchens: number;
}

export function PropertyCard({
  className,
  size,
  images,
  title,
  price,
  address,
  sqft,
  beds,
  baths,
  kitchens,
  ...props
}: PropertyCardProps) {
  return (
    <article
      data-slot="property-card"
      className={twMerge(propertyCardVariants({ size }), className)}
      {...props}
    >
      <PropertyCardImage images={images} alt={title} />
      <PropertyCardBody>
        <PropertyCardHeader title={title} price={price} />
        <PropertyCardLocation address={address} sqft={sqft} />
        <PropertyCardFeatures beds={beds} baths={baths} kitchens={kitchens} />
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
      className={twMerge('flex flex-col gap-3 p-4', className)}
      {...props}
    />
  );
}

function PropertyCardHeader({ title, price }: { title: string; price: number }) {
  return (
    <div data-slot="property-card-header" className="flex items-center justify-between gap-2">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <span className="text-lg font-bold text-primary">${price.toLocaleString()}</span>
    </div>
  );
}

function PropertyCardLocation({ address, sqft }: { address: string; sqft: number }) {
  return (
    <div data-slot="property-card-location" className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-sm text-foreground-subtle">
        <MapPin className="size-3.5 text-accent" />
        <span>{address}</span>
      </div>
      <span className="text-sm text-foreground-subtle">({sqft.toLocaleString()}sqft)</span>
    </div>
  );
}

function PropertyCardFeatures({
  beds,
  baths,
  kitchens,
}: {
  beds: number;
  baths: number;
  kitchens: number;
}) {
  return (
    <div data-slot="property-card-features" className="flex items-center gap-4 pt-1">
      <div className="flex items-center gap-1.5 text-sm text-foreground-subtle">
        <BedDouble className="size-3.5 text-accent" />
        <span>{beds} Bed</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-foreground-subtle">
        <Bath className="size-3.5 text-accent" />
        <span>{baths} Bath</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-foreground-subtle">
        <CookingPot className="size-3.5 text-accent" />
        <span>{kitchens} Kitchen</span>
      </div>
    </div>
  );
}
