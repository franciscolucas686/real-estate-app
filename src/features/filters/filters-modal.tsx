import { useEffect, useState } from 'react';
import { Modal } from '@/ui/modal';
import { Field } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { ChipGroup } from '@/ui/chip-group';
import { RangeFilter } from '@/ui/range-filter';
import { cn } from '@/shared/cn';
import { BusinessType, PropertyType, SaleType } from '@/shared/api/types';
import { BusinessTypeLabel, PropertyTypeLabel, SaleTypeLabel } from '@/shared/format';
import { DEFAULT_FILTERS, type PropertyFilters } from '@/features/filters/filter-types';
import { useFilters } from '@/features/filters/use-filters';

/** Slider ceilings. At the ceiling the filter means "no upper bound", not "at most N". */
const MAX_PRICE = 5_000_000;
const MAX_TOTAL_AREA = 1000;

const COUNT_OPTIONS = [1, 2, 3, 4].map((n) => ({ label: `${n}+`, value: String(n) }));

const TOGGLE_BASE =
  'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors md:hover:border-foreground-subtle/40';
const TOGGLE_ON = 'border-action bg-action/10 text-action';
const TOGGLE_OFF = 'border-border bg-surface-raised text-foreground';

/**
 * The app's single filter surface.
 *
 * There used to be two: a full-page `/search/filters` route for mobile with twelve filter
 * groups, and this modal for desktop with six. They were not two presentations of one
 * thing — they had *different capabilities*: property type was multi-select on mobile and
 * single-select on desktop, and sale modality (`saleTypes`) had no desktop UI at all, so a
 * search built on a phone could be silently narrowed by opening it on a laptop. A
 * responsive `Modal` removes the reason two surfaces existed: sheet on a phone, dialog on
 * a desktop, one implementation, one feature set.
 *
 * Edits go into a local draft and commit on "Aplicar". The listing's inline controls
 * (search box, QuickFilters) write straight through, because there the change *is* the
 * intent; inside a modal the user expects to be able to back out, and dismissing it must
 * leave the results untouched.
 */
export function FiltersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, setFilters } = useFilters();
  const [draft, setDraft] = useState<PropertyFilters>(filters);

  // Re-seed on each open so a discarded draft never leaks into the next session.
  useEffect(() => {
    if (open) setDraft(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only on open
  }, [open]);

  function update<K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleType(value: PropertyType) {
    setDraft((prev) => ({
      ...prev,
      types: prev.types.includes(value)
        ? prev.types.filter((t) => t !== value)
        : [...prev.types, value],
    }));
  }

  function toggleSaleType(value: SaleType) {
    setDraft((prev) => ({
      ...prev,
      saleTypes: prev.saleTypes.includes(value)
        ? prev.saleTypes.filter((s) => s !== value)
        : [...prev.saleTypes, value],
    }));
  }

  function apply() {
    setFilters(draft);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filtros"
      titleClassName="text-xl"
      panelClassName="md:max-w-2xl lg:max-w-3xl"
    >
      <div className="flex flex-col gap-6 px-6 pb-4 md:px-0 md:pb-0">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field asGroup label="Tipo de negócio">
            <div className="inline-flex mt-4 self-start rounded-full bg-surface p-1">
              {[BusinessType.SALE, BusinessType.RENT].map((value) => {
                const selected = draft.businessType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update('businessType', selected ? undefined : value)}
                    className={cn(
                      'min-h-11 rounded-full px-10 text-sm font-medium transition-all',
                      selected
                        ? 'bg-surface-raised text-foreground shadow-sm'
                        : 'text-foreground-subtle md:hover:text-foreground',
                    )}
                  >
                    {BusinessTypeLabel[value]}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field asGroup label="Tipo de imóvel">
            {/* Multi-select at every width. The desktop dropdown used to *replace* the
                whole selection with a single value. */}
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.values(PropertyType).map((value) => {
                const selected = draft.types.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleType(value)}
                    className={cn(TOGGLE_BASE, selected ? TOGGLE_ON : TOGGLE_OFF)}
                  >
                    {PropertyTypeLabel[value]}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="hidden border-t border-border md:block" />

        {draft.businessType === BusinessType.SALE && (
          <Field asGroup label="Modalidade de venda">
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.values(SaleType).map((value) => {
                const selected = draft.saleTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSaleType(value)}
                    className={cn(TOGGLE_BASE, selected ? TOGGLE_ON : TOGGLE_OFF)}
                  >
                    {SaleTypeLabel[value]}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field asGroup label="Valor do imóvel">
          <RangeFilter
            className="mt-4"
            min={0}
            max={MAX_PRICE}
            step={10_000}
            value={[
              draft.minPrice ? Number(draft.minPrice) : 0,
              draft.maxPrice ? Number(draft.maxPrice) : MAX_PRICE,
            ]}
            onChange={([min, max], source) => {
              setDraft((prev) => ({
                ...prev,
                minPrice: min === 0 ? '' : String(min),
                // At the slider's ceiling this must clear maxPrice, not store it: dragging
                // only the minimum thumb still reports max = MAX_PRICE, and storing that
                // would drop every property above R$ 5.000.000 from the results. Typing the
                // same number is different — the user asked for that exact value, so only
                // the slider gets the "no upper bound" treatment.
                maxPrice: source === 'slider' && max >= MAX_PRICE ? '' : String(max),
              }));
            }}
            prefix="R$"
          />
        </Field>

        <div className="hidden border-t border-border md:block" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field label="Bairro">
            <Input
              value={draft.neighborhood}
              onChange={(e) => update('neighborhood', e.target.value)}
              placeholder="Ex: Campolim"
              className="mt-4"
            />
          </Field>
          <Field label="Cidade">
            <Input
              value={draft.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Ex: Sorocaba"
              className="mt-4"
            />
          </Field>
          <Field label="Estado">
            <Input
              value={draft.state}
              onChange={(e) => update('state', e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="Ex: SP"
              className="mt-4"
            />
          </Field>
        </div>

        <div className="hidden border-t border-border md:block" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field asGroup label="Quartos (mínimo)">
            <ChipGroup
              className="mt-4"
              options={COUNT_OPTIONS}
              value={draft.minBedrooms?.toString() ?? null}
              onChange={(v) => update('minBedrooms', v ? Number(v) : undefined)}
            />
          </Field>
          <Field asGroup label="Banheiros (mínimo)">
            <ChipGroup
              className="mt-4"
              options={COUNT_OPTIONS}
              value={draft.minBathrooms?.toString() ?? null}
              onChange={(v) => update('minBathrooms', v ? Number(v) : undefined)}
            />
          </Field>
          <Field asGroup label="Vagas (mínimo)">
            <ChipGroup
              className="mt-4"
              options={COUNT_OPTIONS}
              value={draft.minParkingSpaces?.toString() ?? null}
              onChange={(v) => update('minParkingSpaces', v ? Number(v) : undefined)}
            />
          </Field>
        </div>

        <div className="hidden border-t border-border md:block" />

        <Field asGroup label="Área total (m²)">
          <RangeFilter
            className="mt-4"
            min={0}
            max={MAX_TOTAL_AREA}
            step={5}
            value={[draft.minTotalArea ?? 0, draft.maxTotalArea ?? MAX_TOTAL_AREA]}
            onChange={([min, max], source) => {
              setDraft((prev) => ({
                ...prev,
                minTotalArea: min === 0 ? undefined : min,
                maxTotalArea: source === 'slider' && max >= MAX_TOTAL_AREA ? undefined : max,
              }));
            }}
            suffix="m²"
          />
        </Field>

        {/* z-40 beats the RangeFilter thumb's z-30 (range-filter.tsx) — without an explicit
            z-index this sticky footer defaults to `auto`, which loses to any positioned
            sibling with a numeric z-index, including a slider thumb mid-drag. */}
        <div className="sticky bottom-0 z-40 flex gap-3 border-t border-border bg-background py-4 md:static md:border-0 md:pt-2">
          <Button
            variant="ghost"
            shape="pill"
            onClick={() => setDraft({ ...DEFAULT_FILTERS, sort: draft.sort })}
          >
            Limpar
          </Button>
          <Button shape="pill" onClick={apply} className="flex-1">
            Aplicar filtros
          </Button>
        </div>
      </div>
    </Modal>
  );
}
