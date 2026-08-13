import { Field, Input } from '@/features/properties/components/form/form-controls';
import { PropertyType } from '@/shared/api/types';
import {
  HouseFields,
  ApartmentFields,
  LandFields,
  SmallFarmFields,
  CountryHouseFields,
} from '@/features/properties/components/form/subtype-fields';
import type { FormState, Setter } from '@/features/properties/components/form/form-state';

export function Step3({ form, set }: { form: FormState; set: Setter }) {
  const bathroomsNum = form.bathrooms ? Number(form.bathrooms) : undefined;
  const isLand = form.type === PropertyType.LAND;
  const isApartment = form.type === PropertyType.APARTMENT;

  return (
    <>
      {/* General specs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {!isLand && (
          <>
            <Field label="Quartos">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.bedrooms}
                onChange={(v) => set('bedrooms', v)}
              />
            </Field>
            <Field label="Banheiros">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.bathrooms}
                onChange={(v) => set('bathrooms', v)}
              />
            </Field>
            <Field label={`Suítes${bathroomsNum ? ` (máx ${bathroomsNum})` : ''}`}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.suites}
                onChange={(v) => {
                  const n = Number(v);
                  set('suites', bathroomsNum && n > bathroomsNum ? String(bathroomsNum) : v);
                }}
              />
            </Field>
            <Field label="Vagas">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={form.parkingSpaces}
                onChange={(v) => set('parkingSpaces', v)}
              />
            </Field>
          </>
        )}
        <Field label={`Área total (m²)${isLand || isApartment ? ' *' : ''}`}>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.totalArea}
            onChange={(v) => set('totalArea', v)}
          />
        </Field>
        {!isLand && !isApartment && (
          <Field label="Área construída (m²)">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.builtArea}
              onChange={(v) => set('builtArea', v)}
            />
          </Field>
        )}
      </div>

      {/* Type-specific */}
      {form.type === PropertyType.HOUSE && <HouseFields form={form} set={set} />}
      {form.type === PropertyType.APARTMENT && <ApartmentFields form={form} set={set} />}
      {form.type === PropertyType.LAND && <LandFields form={form} set={set} />}
      {form.type === PropertyType.SMALL_FARM && <SmallFarmFields form={form} set={set} />}
      {form.type === PropertyType.COUNTRY_HOUSE && <CountryHouseFields form={form} set={set} />}

      <Field label="Descrição *">
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          placeholder="Descreva o imóvel..."
          className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-action resize-none"
        />
      </Field>
    </>
  );
}
