import { useCallback, useEffect, useState } from 'react';
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
import { BOTTOM_NAV_CLEARANCE } from '@/layout/app-nav';
import { cn } from '@/shared/cn';
import { Button } from '@/ui/button';
import { NumericInput } from '@/ui/numeric-input';
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

  const goToPage = useCallback(
    (next: number, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next <= 1) params.delete('page');
          else params.set('page', String(next));
          return params;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  /**
   * `page` travels in the URL, so it can arrive already out of range — a link shared when
   * the listing had five pages, opened after the inventory shrank to one. No filter changed,
   * so dropping `page` on a filter write doesn't help here, and nothing on screen recovers
   * from it: the grid is empty while the header announces a non-zero count, and `Pagination`
   * renders nothing at `totalPages <= 1`, so there is no control left to click.
   *
   * Gated on `total !== null` — the query has to have answered before "out of range" means
   * anything, and `total` is deliberately `null` rather than `0` until then. `replace`
   * because a broken offset is not a place the back button should return to.
   */
  useEffect(() => {
    if (total === null || page <= totalPages) return;
    goToPage(totalPages, { replace: true });
  }, [total, page, totalPages, goToPage]);

  return (
    <div
      data-slot="page-properties"
      className={cn('flex flex-col bg-background md:pb-0', BOTTOM_NAV_CLEARANCE)}
    >
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
          <NumericInput
            type="search"
            aria-label="Buscar por código"
            value={codeInput.value}
            onChange={(e) => codeInput.onChange(e.target.value)}
            placeholder="Código do imóvel"
            className="hidden sm:block sm:w-56"
          />

          {/* Primary filters stay visible from `sm:` up; below that they'd wrap into a
              wall of controls, so the drawer carries them. Progressive disclosure. */}
          <div className="hidden sm:contents">
            <QuickFilters />
          </div>

          {/* No `shape` here on purpose — the default `control` (`rounded-xl`) is the point.
              This button sits in a row with the `Dropdown` triggers, and the sort `Select`
              below matches it, so a `pill` would be the odd one out. Everywhere else in the
              app the button is `shape="pill"`; do not "restore" it here for symmetry. */}
          <Button
            variant={activeCount > 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFiltersOpen(true)}
            className="w-full shrink-0 sm:w-auto min-h-10"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {activeCount > 0 ? (
              `Filtros · ${activeCount}`
            ) : (
              <>
                <span className="sm:hidden">Filtros</span>
                <span className="hidden sm:inline">Mais filtros</span>
              </>
            )}
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

          {/* `sr-only` rather than no text at all: dropping the visible "Ordenar" left the
              `<label>` empty, and an empty label associates nothing — the select announced
              itself as a bare combo box with no indication of what it sorts. The options
              read "Mais recentes"/"Mais antigos", which say nothing on their own either. */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="sr-only">Ordenar</span>
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

        <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} className="pt-2" />
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
