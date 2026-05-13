import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { PropertyList } from '../components/features/property-list';
import { PageContainer } from '../components/ui/page-container';
import { useFilters } from '../hooks/use-filters';
import { countActiveFilters } from '../types/filters';
import { PropertyTypeLabel, BusinessTypeLabel } from '../utils/format';
import { BusinessType, PropertyType } from '../types/api';
import { twMerge } from 'tailwind-merge';

const QUICK_TYPES: { label: string; value: PropertyType }[] = [
  { label: PropertyTypeLabel[PropertyType.APARTMENT], value: PropertyType.APARTMENT },
  { label: PropertyTypeLabel[PropertyType.HOUSE], value: PropertyType.HOUSE },
  { label: PropertyTypeLabel[PropertyType.LAND], value: PropertyType.LAND },
  { label: PropertyTypeLabel[PropertyType.SMALL_FARM], value: PropertyType.SMALL_FARM },
  { label: PropertyTypeLabel[PropertyType.COUNTRY_HOUSE], value: PropertyType.COUNTRY_HOUSE },
];

export function Home() {
  const navigate = useNavigate();
  const { filters, updateFilter, resetFilters } = useFilters();
  const activeCount = countActiveFilters(filters);

  return (
    <div data-slot="page-home" className="flex flex-col pb-24">
      {/* Header */}
      <PageContainer className="pt-4 pb-3">
        <h1 className="text-2xl font-bold text-foreground">Imóveis</h1>
      </PageContainer>

      {/* Quick filter chips */}
      <PageContainer className="pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {/* Business type chips */}
          <Chip
            active={filters.businessType === BusinessType.SALE}
            onClick={() =>
              updateFilter(
                'businessType',
                filters.businessType === BusinessType.SALE ? undefined : BusinessType.SALE,
              )
            }
          >
            {BusinessTypeLabel[BusinessType.SALE]}
          </Chip>
          <Chip
            active={filters.businessType === BusinessType.RENT}
            onClick={() =>
              updateFilter(
                'businessType',
                filters.businessType === BusinessType.RENT ? undefined : BusinessType.RENT,
              )
            }
          >
            {BusinessTypeLabel[BusinessType.RENT]}
          </Chip>

          <div className="h-5 w-px shrink-0 bg-border" />

          {/* Type chips */}
          {QUICK_TYPES.map((t) => (
            <Chip
              key={t.value}
              active={filters.type === t.value}
              onClick={() => updateFilter('type', filters.type === t.value ? undefined : t.value)}
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </PageContainer>

      {/* Advanced filter bar */}
      <PageContainer className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => navigate('/search/filters')}
          className={twMerge(
            'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            activeCount > 0
              ? 'border-action bg-action/10 text-action'
              : 'border-border bg-surface-raised text-foreground-subtle',
          )}
        >
          <SlidersHorizontal size={16} />
          Filtros{activeCount > 0 && ` (${activeCount})`}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-muted-foreground underline"
          >
            Limpar
          </button>
        )}
      </PageContainer>

      {/* Property list */}
      <PageContainer>
        <PropertyList />
      </PageContainer>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'border-action bg-action text-white'
          : 'border-border bg-surface-raised text-foreground-subtle',
      )}
    >
      {children}
    </button>
  );
}
