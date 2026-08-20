import { cn } from '@/shared/cn';
import { useEffect, type ComponentProps } from 'react';
import { PropertyCard } from '@/features/properties/components/property-card';
import { useProperties } from '@/features/properties/hooks/use-properties';
import { useFilters } from '@/features/filters/use-filters';
import { PropertyCardSkeleton } from '@/features/properties/components/property-skeletons';
import { publicFiltersToApiParams } from '@/features/filters/filter-types';

export type PropertyListProps = ComponentProps<'section'> & {
  take?: number;
  /** Pagination offset, in items — defaults to 0 (first page). */
  skip?: number;
  /** Fires with `data.total` whenever the query resolves, so a parent can render pagination outside this component. */
  onTotalChange?: (total: number) => void;
};

export function PropertyList({
  className,
  take = 20,
  skip = 0,
  onTotalChange,
  ...props
}: PropertyListProps) {
  const { filters } = useFilters();
  const apiParams = { ...publicFiltersToApiParams(filters, take), skip };
  const { data, isLoading, isError } = useProperties(apiParams);

  useEffect(() => {
    if (data) onTotalChange?.(data.total);
  }, [data, onTotalChange]);

  if (isLoading) {
    return (
      <section
        data-slot="property-list"
        className={cn(
          'flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4',
          className,
        )}
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
        className={cn('flex flex-col items-center gap-4 py-10', className)}
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
        className={cn('flex flex-col items-center gap-4 py-16', className)}
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
      className={cn(
        'flex flex-col gap-4 mb-8 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
      {...props}
    >
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </section>
  );
}
