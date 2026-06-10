import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useFilters } from '../hooks/use-filters';
import { RangeFilter } from '../components/ui/range-filter';
import { ChipGroup } from '../components/ui/chip-group';
import { PageContainer } from '../components/ui/page-container';
import { ScrollableContent } from '../components/ui/scrollable-content';
import { PropertyTypeLabel, BusinessTypeLabel, SaleTypeLabel } from '../utils/format';
import { BusinessType, PropertyType, SaleType } from '../types/api';

const PROPERTY_TYPE_OPTIONS = Object.values(PropertyType).map((v) => ({
  label: PropertyTypeLabel[v],
  value: v,
}));

const COUNT_OPTIONS = [
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
];

const SORT_OPTIONS = [
  { label: 'Mais recentes', value: 'newest' },
  { label: 'Mais antigos', value: 'oldest' },
];

const SALE_TYPE_OPTIONS = Object.values(SaleType).map((v) => ({
  label: SaleTypeLabel[v],
  value: v,
}));

function priceToNum(v: string): number {
  return v ? Number(v) : 0;
}
function numToPrice(v: number): string {
  return v === 0 ? '' : String(v);
}

export function Filters() {
  const navigate = useNavigate();
  const { filters, updateFilter, resetFilters } = useFilters();

  const minPriceNum = priceToNum(filters.minPrice);
  const maxPriceNum = priceToNum(filters.maxPrice) || 5_000_000;

  function handlePriceRange([min, max]: [number, number]) {
    updateFilter('minPrice', numToPrice(min));
    updateFilter('maxPrice', numToPrice(max));
  }

  const minAreaNum = filters.minTotalArea ?? 0;
  const maxAreaNum = filters.maxTotalArea ?? 1000;

  function handleAreaRange([min, max]: [number, number]) {
    updateFilter('minTotalArea', min === 0 ? undefined : min);
    updateFilter('maxTotalArea', max === 1000 ? undefined : max);
  }

  return (
    <div data-slot="page-filters" className="flex h-dvh flex-col bg-background">
      {/* Header - FORA do scroll context */}
      <PageContainer
        withSafeAreaTop
        className="flex shrink-0 items-center justify-between gap-3 bg-background pb-2 pt-4"
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-11 items-center justify-center rounded-full"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-base font-semibold text-foreground">Filtros</span>
        <button type="button" onClick={resetFilters} className="text-sm font-medium text-action">
          Limpar
        </button>
      </PageContainer>

      {/* Scrollable content - COM scroll isolado */}
      <ScrollableContent hasFixedBottomButton={true}>
        <PageContainer>
          <div className="flex flex-col gap-8 py-2">
            {/* Código do imóvel */}
            <FilterSection title="Código do imóvel">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 575301"
                value={filters.code}
                onChange={(e) => updateFilter('code', e.target.value)}
                className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
              />
            </FilterSection>

            {/* Tipo de negócio */}
            <FilterSection title="Tipo de negócio">
              <div className="inline-flex self-start rounded-full bg-surface p-1">
                {[BusinessType.RENT, BusinessType.SALE].map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() =>
                      updateFilter('businessType', filters.businessType === bt ? undefined : bt)
                    }
                    className={twMerge(
                      'rounded-full px-6 py-2.5 text-sm font-medium transition-all',
                      filters.businessType === bt
                        ? 'bg-surface-raised text-foreground shadow-sm'
                        : 'text-foreground-subtle',
                    )}
                  >
                    {BusinessTypeLabel[bt]}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Ordenação */}
            <FilterSection title="Ordenar por">
              <ChipGroup
                options={SORT_OPTIONS}
                value={filters.sort}
                onChange={(v) => updateFilter('sort', (v ?? 'newest') as 'newest' | 'oldest')}
              />
            </FilterSection>

            {/* Tipo de imóvel */}
            <FilterSection title="Tipo de imóvel">
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPE_OPTIONS.map((opt) => {
                  const selected = filters.types.includes(opt.value as PropertyType);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? filters.types.filter((t) => t !== opt.value)
                          : [...filters.types, opt.value as PropertyType];
                        updateFilter('types', next);
                      }}
                      className={twMerge(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        selected
                          ? 'border-action bg-action/10 text-action'
                          : 'border-border bg-surface-raised text-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Modalidade de venda — only for SALE */}
            {filters.businessType === BusinessType.SALE && (
              <FilterSection title="Modalidade">
                <div className="flex flex-wrap gap-2">
                  {SALE_TYPE_OPTIONS.map((opt) => {
                    const sel = filters.saleTypes.includes(opt.value as SaleType);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const next = sel
                            ? filters.saleTypes.filter((s) => s !== opt.value)
                            : [...filters.saleTypes, opt.value as SaleType];
                          updateFilter('saleTypes', next);
                        }}
                        className={twMerge(
                          'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                          sel
                            ? 'border-action bg-action/10 text-action'
                            : 'border-border bg-surface-raised text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>
            )}

            {/* Faixa de preço */}
            <FilterSection title="Valor do imóvel">
              <RangeFilter
                min={0}
                max={5_000_000}
                step={10_000}
                value={[minPriceNum, maxPriceNum]}
                onChange={handlePriceRange}
                prefix="R$"
              />
            </FilterSection>

            {/* Localização */}
            <FilterSection title="Localização">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Bairro"
                  value={filters.neighborhood}
                  onChange={(e) => updateFilter('neighborhood', e.target.value)}
                  className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
                />
                <input
                  type="text"
                  placeholder="Cidade"
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
                />
                <input
                  type="text"
                  placeholder="Estado (ex: SP)"
                  value={filters.state}
                  onChange={(e) => updateFilter('state', e.target.value)}
                  className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
                />
              </div>
            </FilterSection>

            {/* Quartos */}
            <FilterSection title="Quartos (mínimo)">
              <ChipGroup
                options={COUNT_OPTIONS}
                value={filters.minBedrooms?.toString() ?? null}
                onChange={(v) => updateFilter('minBedrooms', v ? Number(v) : undefined)}
              />
            </FilterSection>

            {/* Banheiros */}
            <FilterSection title="Banheiros (mínimo)">
              <ChipGroup
                options={COUNT_OPTIONS}
                value={filters.minBathrooms?.toString() ?? null}
                onChange={(v) => updateFilter('minBathrooms', v ? Number(v) : undefined)}
              />
            </FilterSection>

            {/* Vagas */}
            <FilterSection title="Vagas de garagem (mínimo)">
              <ChipGroup
                options={COUNT_OPTIONS}
                value={filters.minParkingSpaces?.toString() ?? null}
                onChange={(v) => updateFilter('minParkingSpaces', v ? Number(v) : undefined)}
              />
            </FilterSection>

            {/* Área */}
            <FilterSection title="Área total (m²)">
              <RangeFilter
                min={0}
                max={1000}
                step={5}
                value={[minAreaNum, maxAreaNum]}
                onChange={handleAreaRange}
                suffix="m²"
              />
            </FilterSection>
          </div>
        </PageContainer>
      </ScrollableContent>

      {/* Apply */}
      <PageContainer className="fixed inset-x-0 bottom-0 z-40 bg-background/90 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] pt-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Aplicar filtros
        </button>
      </PageContainer>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-base font-semibold text-foreground">{title}</span>
      {children}
    </div>
  );
}
