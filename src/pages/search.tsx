import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { PropertyList } from '../components/features/property-list';
import { PageContainer } from '../components/ui/page-container';
import { useFilters } from '../hooks/use-filters';
import { countActiveFilters } from '../types/filters';
import { twMerge } from 'tailwind-merge';

export function Search() {
  const navigate = useNavigate();
  const { filters, resetFilters } = useFilters();
  const activeCount = countActiveFilters(filters);

  return (
    <div data-slot="page-search" className="flex flex-col pb-24">
      {/* Header */}
      <PageContainer className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => navigate('/search/filters')}
          className="flex flex-1 items-center gap-3 rounded-full border border-border bg-surface-raised px-4 py-3 text-sm text-muted-foreground shadow-sm"
        >
          <SearchIcon size={18} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">
            {activeCount > 0 ? `${activeCount} filtro(s) ativo(s)` : 'Buscar imóveis...'}
          </span>
          <SlidersHorizontal
            size={18}
            className={twMerge(
              'shrink-0',
              activeCount > 0 ? 'text-action' : 'text-muted-foreground',
            )}
          />
        </button>
      </PageContainer>

      {/* Active filter summary */}
      {activeCount > 0 && (
        <PageContainer className="flex items-center justify-between pb-3">
          <span className="text-sm text-foreground-subtle">Filtros ativos: {activeCount}</span>
          <button type="button" onClick={resetFilters} className="text-sm text-action underline">
            Limpar tudo
          </button>
        </PageContainer>
      )}

      {/* Results */}
      <PageContainer>
        <PropertyList />
      </PageContainer>
    </div>
  );
}
