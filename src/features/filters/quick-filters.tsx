import { useFilters } from '@/features/filters/use-filters';
import { cn } from '@/shared/cn';
import { Dropdown } from '@/ui/dropdown';
import { ChipGroup } from '@/ui/chip-group';
import { RangeFilter } from '@/ui/range-filter';
import { PropertyTypeLabel, BusinessTypeLabel } from '@/shared/format';
import { PropertyType, BusinessType } from '@/shared/api/types';
import { countActiveFilters } from '@/features/filters/filter-types';

const PROPERTY_TYPE_OPTIONS = Object.values(PropertyType).map((v) => ({
  label: PropertyTypeLabel[v],
  value: v,
}));

const BUSINESS_TYPE_OPTIONS = [BusinessType.RENT, BusinessType.SALE].map((v) => ({
  label: BusinessTypeLabel[v],
  value: v,
}));

/** Slider ceilings. At the ceiling the filter means "no upper bound", not "at most N". */
const MAX_PRICE = 5_000_000;
const MAX_TOTAL_AREA = 1000;

function priceToNum(v: string): number {
  return v ? Number(v) : 0;
}

/**
 * The primary filters, inline above the results grid.
 *
 * These commit straight through to the URL on every change — unlike `FiltersModal`, where
 * edits are a draft. That difference is intentional: an inline control's change *is* the
 * intent, while a modal has to be dismissible without side effects.
 *
 * Shown from `sm:` up; below that the same filters live in the modal, which is the
 * progressive-disclosure split for the toolbar.
 */
export function QuickFilters() {
  const { filters, updateFilter, setFilters } = useFilters();
  const activeCount = countActiveFilters(filters);

  const minPriceNum = priceToNum(filters.minPrice);
  const maxPriceNum = priceToNum(filters.maxPrice) || MAX_PRICE;
  const hasPriceFilter = Boolean(filters.minPrice || filters.maxPrice);

  function handlePriceRange([min, max]: [number, number], source: 'slider' | 'text') {
    // Both bounds in one write, and reaching the slider's ceiling clears `maxPrice`
    // instead of storing it: dragging only the minimum thumb still reports
    // max = MAX_PRICE, and storing that would silently drop every property above
    // R$ 5.000.000. This was the same defect fixed on the (now retired) filters page — it
    // lived here too, unnoticed, because the two surfaces duplicated the logic instead of
    // sharing it. Typing that same number is a literal request for that value, not a
    // "no bound" gesture, so only the slider gets the clearing treatment.
    setFilters({
      ...filters,
      minPrice: min === 0 ? '' : String(min),
      maxPrice: source === 'slider' && max >= MAX_PRICE ? '' : String(max),
    });
  }

  const minAreaNum = filters.minTotalArea ?? 0;
  const maxAreaNum = filters.maxTotalArea ?? MAX_TOTAL_AREA;
  const hasAreaFilter = filters.minTotalArea != null || filters.maxTotalArea != null;

  function handleAreaRange([min, max]: [number, number], source: 'slider' | 'text') {
    setFilters({
      ...filters,
      minTotalArea: min === 0 ? undefined : min,
      maxTotalArea: source === 'slider' && max >= MAX_TOTAL_AREA ? undefined : max,
    });
  }

  function toggleType(value: PropertyType) {
    updateFilter(
      'types',
      filters.types.includes(value)
        ? filters.types.filter((t) => t !== value)
        : [...filters.types, value],
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Dropdown label="Tipo" active={filters.types.length > 0}>
        {() => (
          // Multi-select, and the panel stays open between picks. It used to be a
          // ChipGroup bound to `types[0]`, so choosing a type *replaced* the whole
          // selection — a search built with three types on a phone collapsed to one the
          // moment this control was touched.
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPE_OPTIONS.map((option) => {
              const selected = filters.types.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleType(option.value)}
                  className={cn(
                    'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
                    selected
                      ? 'border-action bg-action/10 text-action'
                      : 'border-border bg-surface-raised text-foreground md:hover:border-foreground-subtle/40',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </Dropdown>

      <Dropdown label="Negócio" active={Boolean(filters.businessType)}>
        {(close) => (
          <ChipGroup
            options={BUSINESS_TYPE_OPTIONS}
            value={filters.businessType ?? null}
            onChange={(v) => {
              updateFilter('businessType', (v as BusinessType) || undefined);
              close();
            }}
          />
        )}
      </Dropdown>

      <Dropdown label="Valor" active={hasPriceFilter} panelClassName="w-80">
        {() => (
          <RangeFilter
            min={0}
            max={MAX_PRICE}
            step={10_000}
            value={[minPriceNum, maxPriceNum]}
            onChange={handlePriceRange}
            prefix="R$"
          />
        )}
      </Dropdown>

      <Dropdown label="Área total" active={hasAreaFilter} panelClassName="w-80">
        {() => (
          <RangeFilter
            min={0}
            max={MAX_TOTAL_AREA}
            step={5}
            value={[minAreaNum, maxAreaNum]}
            onChange={handleAreaRange}
            suffix="m²"
          />
        )}
      </Dropdown>

      {activeCount > 0 && (
        <span className="text-sm font-medium text-action">
          {activeCount} filtro{activeCount !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
