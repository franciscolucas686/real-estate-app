import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
import { PropertyCard } from './property-card';
import { useProperties } from '../../hooks/use-properties';
import { useFilters } from '../../hooks/use-filters';
import { PropertyCardSkeleton } from '../ui/skeletons';
import { filtersToApiParams } from '../../types/filters';

export type PropertyListProps = ComponentProps<'section'> & {
  take?: number;
};

export function PropertyList({ className, take = 20, ...props }: PropertyListProps) {
  const { filters } = useFilters();
  const apiParams = filtersToApiParams(filters, take);
  const { data, isLoading, isError } = useProperties(apiParams);

  if (isLoading) {
    return (
      <section
        data-slot="property-list"
        className={twMerge('flex flex-col gap-4', className)}
        {...props}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </section>
    );
  }

  if (isError) {
    return (
      <section
        data-slot="property-list"
        className={twMerge('flex flex-col items-center gap-4 py-10', className)}
        {...props}
      >
        <p className="text-center text-sm text-foreground-subtle">
          Erro ao carregar imóveis. Tente novamente.
        </p>
      </section>
    );
  }

  const properties = data?.data ?? [];

  if (properties.length === 0) {
    return (
      <section
        data-slot="property-list"
        className={twMerge('flex flex-col items-center gap-4 py-16', className)}
        {...props}
      >
        <p className="text-center text-base font-medium text-foreground">
          Nenhum imóvel encontrado
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Tente ajustar os filtros de busca.
        </p>
      </section>
    );
  }

  return (
    <section
      data-slot="property-list"
      className={twMerge('flex flex-col gap-4', className)}
      {...props}
    >
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </section>
  );
}
