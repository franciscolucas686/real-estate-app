import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { PropertyList } from '../components/features/property-list';
import { PageContainer } from '../components/ui/page-container';
import { ScrollableContent } from '../components/ui/scrollable-content';
import { useFilters } from '../hooks/use-filters';
import { countActiveFilters } from '../types/filters';
import { twMerge } from 'tailwind-merge';

export function Search() {
  const navigate = useNavigate();
  const { filters, resetFilters } = useFilters();
  const activeCount = countActiveFilters(filters);

  return (
    <div data-slot="page-search" className="flex h-dvh flex-col bg-background">
      {/* Header - FORA do scroll context */}
      <PageContainer
        withSafeAreaTop
        className="flex shrink-0 items-center gap-3 py-3 bg-background"
      >
        <button
          type="button"
          onClick={() => navigate('/search/filters')}
          className="flex flex-1 items-center gap-3 rounded-full border border-border bg-surface-raised px-4 py-3 text-lg font-bold text-muted-foreground shadow-sm"
        >
          <SlidersHorizontal
            size={24}
            className={twMerge(
              'shrink-0',
              activeCount > 0 ? 'text-action' : 'text-muted-foreground',
            )}
          />
          <span
            className={twMerge(
              'flex-1 text-left',
              activeCount > 0 ? 'text-action' : 'text-muted-foreground',
            )}
          >
            {activeCount > 0
              ? `${activeCount} Filtro${activeCount !== 1 ? 's' : ''} de imóvel`
              : 'Buscar imóveis'}
          </span>
        </button>
      </PageContainer>

      {/* Active filter summary */}
      {activeCount > 0 && (
        <PageContainer className="flex shrink-0 items-center justify-end pb-4 bg-background">
          <button type="button" onClick={resetFilters} className="text-md text-action">
            Limpar filtros
          </button>
        </PageContainer>
      )}

      {/* Scrollable content - COM scroll isolado */}
      <ScrollableContent>
        <PageContainer>
          <PropertyList />
        </PageContainer>
      </ScrollableContent>
    </div>
  );
}
