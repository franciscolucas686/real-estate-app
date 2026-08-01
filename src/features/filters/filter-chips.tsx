import { X } from 'lucide-react';
import { BusinessTypeLabel, PropertyTypeLabel, SaleTypeLabel } from '@/shared/format';
import { DEFAULT_FILTERS, type PropertyFilters } from '@/features/filters/filter-types';
import { useFilters } from '@/features/filters/use-filters';

interface Chip {
  id: string;
  label: string;
  clear: (filters: PropertyFilters) => PropertyFilters;
}

const brl = (value: string) =>
  Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

/**
 * Describes the active filters as individually removable chips.
 *
 * Two problems this solves. First, the filter state was invisible: it lived in a context,
 * and the only feedback was a count on a button ("3 Filtros"), so a user seeing few
 * results could not tell *which* filter was responsible. Second, undoing was all-or-
 * nothing — "Limpar filtros" wiped everything, so narrowing a search meant re-entering
 * the filters you wanted to keep.
 *
 * Range pairs collapse into one chip because "R$ 200.000 – R$ 600.000" is one decision.
 */
function buildChips(filters: PropertyFilters): Chip[] {
  const chips: Chip[] = [];

  if (filters.businessType) {
    chips.push({
      id: 'businessType',
      label: BusinessTypeLabel[filters.businessType],
      clear: (f) => ({ ...f, businessType: undefined }),
    });
  }

  filters.types.forEach((type) => {
    chips.push({
      id: `type-${type}`,
      label: PropertyTypeLabel[type],
      clear: (f) => ({ ...f, types: f.types.filter((t) => t !== type) }),
    });
  });

  filters.saleTypes.forEach((saleType) => {
    chips.push({
      id: `saleType-${saleType}`,
      label: SaleTypeLabel[saleType],
      clear: (f) => ({ ...f, saleTypes: f.saleTypes.filter((s) => s !== saleType) }),
    });
  });

  (['code', 'neighborhood', 'city', 'state'] as const).forEach((key) => {
    const value = filters[key];
    if (!value) return;
    const prefix = { code: 'Cód.', neighborhood: 'Bairro', city: 'Cidade', state: 'Estado' }[key];
    chips.push({
      id: key,
      label: `${prefix}: ${value}`,
      clear: (f) => ({ ...f, [key]: '' }),
    });
  });

  if (filters.minPrice || filters.maxPrice) {
    const min = filters.minPrice ? brl(filters.minPrice) : null;
    const max = filters.maxPrice ? brl(filters.maxPrice) : null;
    chips.push({
      id: 'price',
      label: min && max ? `${min} – ${max}` : min ? `A partir de ${min}` : `Até ${max}`,
      clear: (f) => ({ ...f, minPrice: '', maxPrice: '' }),
    });
  }

  const RANGES = [
    { min: 'minBedrooms', max: 'maxBedrooms', unit: 'quartos' },
    { min: 'minBathrooms', max: 'maxBathrooms', unit: 'banheiros' },
    { min: 'minParkingSpaces', max: 'maxParkingSpaces', unit: 'vagas' },
    { min: 'minTotalArea', max: 'maxTotalArea', unit: 'm² totais' },
    { min: 'minBuiltArea', max: 'maxBuiltArea', unit: 'm² construídos' },
  ] as const;

  RANGES.forEach(({ min, max, unit }) => {
    const minValue = filters[min];
    const maxValue = filters[max];
    if (minValue == null && maxValue == null) return;

    const label =
      minValue != null && maxValue != null
        ? `${minValue}–${maxValue} ${unit}`
        : minValue != null
          ? `${minValue}+ ${unit}`
          : `Até ${maxValue} ${unit}`;

    chips.push({
      id: min,
      label,
      clear: (f) => ({ ...f, [min]: undefined, [max]: undefined }),
    });
  });

  return chips;
}

export function FilterChips({ className }: { className?: string }) {
  const { filters, setFilters } = useFilters();
  const chips = buildChips(filters);

  if (chips.length === 0) return null;

  return (
    <div className={className}>
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.id}>
            <button
              type="button"
              onClick={() => setFilters(chip.clear(filters))}
              // The whole chip is the remove control: its only purpose is to be undone,
              // so a separate ✕ hit area inside a small pill would just be harder to tap.
              aria-label={`Remover filtro ${chip.label}`}
              className="flex min-h-8 items-center gap-1.5 rounded-full bg-action/10 pl-3 pr-2 text-sm font-semibold text-action transition-colors md:hover:bg-action/20"
            >
              {chip.label}
              <X size={14} aria-hidden="true" className="opacity-70" />
            </button>
          </li>
        ))}

        {chips.length > 1 && (
          <li>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="min-h-8 px-2 text-sm font-medium text-muted-foreground underline-offset-2 transition-colors md:hover:text-foreground md:hover:underline"
            >
              Limpar tudo
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
