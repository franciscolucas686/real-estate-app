import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
import { PropertyCard } from './property-card';
import { properties } from '../../data/properties';

export type PropertyListProps = ComponentProps<'section'>;

export function PropertyList({ className, ...props }: PropertyListProps) {
  return (
    <section
      data-slot="property-list"
      className={twMerge('flex flex-col gap-6', className)}
      {...props}
    >
      {properties.map((property, index) => (
        <PropertyCard key={index} {...property} />
      ))}
    </section>
  );
}
