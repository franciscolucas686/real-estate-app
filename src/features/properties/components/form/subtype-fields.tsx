import { Field, Input, Select, Toggle } from '@/features/properties/components/form/form-controls';
import type { FormState, Setter } from '@/features/properties/components/form/form-state';
import { SunPositionLabel, WaterSourceLabel, ZoningLabel, TopographyLabel } from '@/shared/format';
import { SunPosition, Zoning, Topography, WaterSource } from '@/shared/api/types';

export function HouseFields({ form, set }: { form: FormState; set: Setter }) {
  return (
    <>
      <Field label="Número de andares">
        <Input
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="1"
          value={form.floors}
          onChange={(v) => set('floors', v)}
        />
      </Field>
      <Toggle
        label="Está em condomínio"
        value={form.isInCondominium}
        onChange={(v) => set('isInCondominium', v)}
      />
      {form.isInCondominium && (
        <>
          <Field label="Nome do condomínio">
            <Input
              placeholder="Ex: Residencial das Flores"
              value={form.condominiumName}
              onChange={(v) => set('condominiumName', v)}
            />
          </Field>
          <Field label="Amenidades">
            <Input
              placeholder="Ex: Piscina, churrasqueira"
              value={form.condominiumAmenities}
              onChange={(v) => set('condominiumAmenities', v)}
            />
          </Field>
        </>
      )}
    </>
  );
}

export function ApartmentFields({ form, set }: { form: FormState; set: Setter }) {
  const sunOptions = Object.values(SunPosition).map((v) => ({
    label: SunPositionLabel[v],
    value: v,
  }));
  return (
    <>
      <Field asGroup label="Andar *">
        <Toggle
          label="É térreo"
          value={form.isGroundFloor}
          onChange={(v) => {
            set('isGroundFloor', v);
            if (v) set('floor', ''); // Clear floor when ground floor is selected
          }}
        />
        {!form.isGroundFloor && (
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Ex: 4"
            value={form.floor}
            onChange={(v) => set('floor', v)}
          />
        )}
      </Field>
      <Field label="Posição do sol *">
        <Select
          value={form.sunPosition}
          onChange={(v) => set('sunPosition', v)}
          options={sunOptions}
          placeholder="Selecione..."
        />
      </Field>
      <Toggle
        label="Tem elevador"
        value={form.hasElevator}
        onChange={(v) => set('hasElevator', v)}
      />
      <Toggle label="Tem varanda" value={form.hasBalcony} onChange={(v) => set('hasBalcony', v)} />
      <Toggle label="Tem piscina" value={form.aptHasPool} onChange={(v) => set('aptHasPool', v)} />
    </>
  );
}

export function LandFields({ form, set }: { form: FormState; set: Setter }) {
  const zoningOptions = Object.values(Zoning).map((v) => ({ label: ZoningLabel[v], value: v }));
  const topoOptions = Object.values(Topography).map((v) => ({
    label: TopographyLabel[v],
    value: v,
  }));
  return (
    <>
      <Field label="Zoneamento *">
        <Select
          value={form.zoning}
          onChange={(v) => set('zoning', v)}
          options={zoningOptions}
          placeholder="Selecione..."
        />
      </Field>
      <Field label="Topografia *">
        <Select
          value={form.topography}
          onChange={(v) => set('topography', v)}
          options={topoOptions}
          placeholder="Selecione..."
        />
      </Field>
    </>
  );
}

export function SmallFarmFields({ form, set }: { form: FormState; set: Setter }) {
  const waterOptions = Object.values(WaterSource).map((v) => ({
    label: WaterSourceLabel[v],
    value: v,
  }));
  return (
    <>
      <Field label="Fonte de água *">
        <Select
          value={form.waterSource}
          onChange={(v) => set('waterSource', v)}
          options={waterOptions}
          placeholder="Selecione..."
        />
      </Field>
      <Toggle label="Tem casa sede" value={form.hasHouse} onChange={(v) => set('hasHouse', v)} />
      <Toggle label="Tem piscina" value={form.sfHasPool} onChange={(v) => set('sfHasPool', v)} />
      <Toggle label="Tem lago" value={form.hasLake} onChange={(v) => set('hasLake', v)} />
      <Toggle
        label="Tem pomar"
        value={form.hasFruitTrees}
        onChange={(v) => set('hasFruitTrees', v)}
      />
    </>
  );
}

export function CountryHouseFields({ form, set }: { form: FormState; set: Setter }) {
  return (
    <>
      <Toggle label="Tem rio" value={form.hasRiver} onChange={(v) => set('hasRiver', v)} />
      <Toggle label="Tem nascente" value={form.hasSpring} onChange={(v) => set('hasSpring', v)} />
    </>
  );
}
