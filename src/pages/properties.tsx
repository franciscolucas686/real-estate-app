import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { PropertyList } from '@/features/properties/components/property-list';
import { QuickFilters } from '@/features/filters/quick-filters';
import { FiltersModal } from '@/features/filters/filters-modal';
import { FilterChips } from '@/features/filters/filter-chips';
import { useFilters } from '@/features/filters/use-filters';
import { useFilterTextInput } from '@/features/filters/use-filter-text-input';
import { countActiveFilters, type PropertyFilters } from '@/features/filters/filter-types';
import { PageContainer } from '@/layout/page-container';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Select } from '@/ui/select';
import { Pagination } from '@/ui/pagination';

/**
 * One page size for every viewport.
 *
 * It was `isDesktop ? 10 : 20` with `skip` forced to 0 on mobile and the pagination
 * control marked `hidden md:flex` — so a phone silently showed the first 20 results and
 * offered no way to see the 21st. Same reasoning as the dashboard: page size is a product
 * decision, not a viewport one.
 */
const PAGE_SIZE = 12;

export function Properties() {
  const { filters, updateFilter } = useFilters();
  const codeInput = useFilterTextInput('code');
  const activeCount = countActiveFilters(filters);

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  // `null` until the query resolves. It used to start at 0, so the page asserted
  // "0 imóveis encontrados" while still loading — actively wrong, and the one line a
  // visitor reads before deciding whether to adjust their filters.
  const [total, setTotal] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));

  function goToPage(next: number) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      return params;
    });
  }

  return (
    <div data-slot="page-properties" className="flex flex-col bg-background">
      <PageContainer withSafeAreaTop maxWidth="wide" className="flex flex-col gap-4 pt-4 md:pt-8">
        <div className="flex flex-col gap-1">
          <nav aria-label="Trilha" className="text-sm text-muted-foreground">
            <Link to="/" className="transition-colors md:hover:text-foreground">
              Início
            </Link>
            <span aria-hidden="true"> › </span>
            <span className="text-foreground">Imóveis</span>
          </nav>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Imóveis disponíveis</h1>
        </div>

        {/*
          One toolbar for every width — no `md:hidden` twin.
          The page used to render two completely different headers: a single "Filtros"
          button on mobile that navigated to a separate page, and a code input plus
          QuickFilters plus a "Mais filtros" modal on desktop. They didn't just look
          different, they *did* different things: property type was multi-select on mobile
          and single-select on desktop, and `saleTypes` had no desktop UI at all.
        */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            aria-label="Buscar por código"
            value={codeInput.value}
            onChange={(e) => codeInput.onChange(e.target.value)}
            placeholder="Código do imóvel"
            className="w-full sm:w-56"
          />

          {/* Primary filters stay visible from `sm:` up; below that they'd wrap into a
              wall of controls, so the drawer carries them. Progressive disclosure. */}
          <div className="hidden sm:contents">
            <QuickFilters />
          </div>

          <Button
            variant={activeCount > 0 ? 'primary' : 'secondary'}
            size="sm"
            shape="pill"
            onClick={() => setFiltersOpen(true)}
            className="shrink-0"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {activeCount > 0 ? `Filtros · ${activeCount}` : 'Mais filtros'}
          </Button>
        </div>

        <FilterChips />
      </PageContainer>

      <PageContainer maxWidth="wide" className="flex flex-col gap-5 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-foreground-subtle">
            {total === null ? (
              'Buscando imóveis…'
            ) : (
              <>
                <span className="font-semibold text-foreground">{total}</span> imóve
                {total === 1 ? 'l' : 'is'} encontrado{total === 1 ? '' : 's'}
              </>
            )}
          </p>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Ordenar
            <Select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value as PropertyFilters['sort'])}
              className="h-10 w-auto"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </Select>
          </label>
        </div>

        <PropertyList take={PAGE_SIZE} skip={(page - 1) * PAGE_SIZE} onTotalChange={setTotal} />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          className="pb-10 pt-2"
        />
      </PageContainer>

      {/*
        A single filter surface for both form factors: `Modal`'s responsive presentation
        renders it as a bottom sheet on a phone and a centered dialog on a desktop. The
        old `/search/filters` route existed only because there was no primitive that could
        be both, and having two surfaces is what let their capabilities drift apart.
      */}
      <FiltersModal open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </div>
  );
}
