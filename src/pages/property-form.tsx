import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { PageContainer } from '../components/ui/page-container';
import {
  PropertyTypeLabel,
  BusinessTypeLabel,
  SaleTypeLabel,
  SunPositionLabel,
  ZoningLabel,
  TopographyLabel,
  WaterSourceLabel,
} from '../utils/format';
import {
  PropertyType,
  BusinessType,
  SaleType,
  SunPosition,
  Zoning,
  Topography,
  WaterSource,
} from '../types/api';
import { createProperty, updateProperty, fetchPropertyById } from '../services/property-service';
import type { CreatePropertyDto, PropertyDetailDto } from '../types/api';

// ─── Form state ──────────────────────────────────────────────────────────────
interface FormState {
  // Step 1
  type: PropertyType | '';
  businessType: BusinessType | '';
  saleTypes: SaleType[];
  price: string;
  rentPrice: string;
  condoFee: string;
  whatsappContact: string;
  description: string;
  // Step 2
  city: string;
  state: string;
  neighborhood: string;
  // Step 3
  bedrooms: string;
  bathrooms: string;
  suites: string;
  parkingSpaces: string;
  totalArea: string;
  builtArea: string;
  // House details
  floors: string;
  isInCondominium: boolean;
  condominiumName: string;
  condominiumAmenities: string;
  // Apartment details
  floor: string;
  isGroundFloor: boolean;
  hasElevator: boolean;
  hasBalcony: boolean;
  sunPosition: SunPosition | '';
  aptHasPool: boolean;
  // Land details
  zoning: Zoning | '';
  topography: Topography | '';
  // Small farm
  hasHouse: boolean;
  sfHasPool: boolean;
  hasLake: boolean;
  hasFruitTrees: boolean;
  waterSource: WaterSource | '';
  // Country house
  hasRiver: boolean;
  hasSpring: boolean;
}

const INITIAL: FormState = {
  type: '',
  businessType: '',
  saleTypes: [],
  price: '',
  rentPrice: '',
  condoFee: '',
  whatsappContact: '',
  description: '',
  city: '',
  state: '',
  neighborhood: '',
  bedrooms: '',
  bathrooms: '',
  suites: '',
  parkingSpaces: '',
  totalArea: '',
  builtArea: '',
  floors: '1',
  isInCondominium: false,
  condominiumName: '',
  condominiumAmenities: '',
  floor: '',
  isGroundFloor: false,
  hasElevator: false,
  hasBalcony: false,
  sunPosition: '',
  aptHasPool: false,
  zoning: '',
  topography: '',
  hasHouse: false,
  sfHasPool: false,
  hasLake: false,
  hasFruitTrees: false,
  waterSource: '',
  hasRiver: false,
  hasSpring: false,
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function n(v: string): number | undefined {
  return v ? Number(v) : undefined;
}

function buildPayload(f: FormState): CreatePropertyDto {
  const base: CreatePropertyDto = {
    type: f.type as PropertyType,
    businessType: f.businessType as BusinessType,
    price: f.price,
    city: f.city,
    state: f.state,
    neighborhood: f.neighborhood,
    description: f.description,
    ...(f.businessType === BusinessType.SALE &&
      f.saleTypes.length > 0 && { saleTypes: f.saleTypes }),
    ...(f.businessType === BusinessType.RENT && f.rentPrice && { rentPrice: f.rentPrice }),
    ...(f.condoFee && { condoFee: f.condoFee }),
    ...(f.whatsappContact && { whatsappContact: f.whatsappContact }),
    ...(f.bedrooms && { bedrooms: n(f.bedrooms) }),
    ...(f.bathrooms && { bathrooms: n(f.bathrooms) }),
    ...(f.suites && { suites: n(f.suites) }),
    ...(f.parkingSpaces && { parkingSpaces: n(f.parkingSpaces) }),
    ...(f.totalArea && { totalArea: n(f.totalArea) }),
    ...(f.builtArea && { builtArea: n(f.builtArea) }),
  };

  if (f.type === PropertyType.HOUSE) {
    base.house = {
      floors: Number(f.floors) || 1,
      isInCondominium: f.isInCondominium,
      condominiumName: f.isInCondominium ? f.condominiumName || null : null,
      condominiumAmenities: f.isInCondominium ? f.condominiumAmenities || null : null,
    };
  } else if (f.type === PropertyType.APARTMENT) {
    base.apartment = {
      floor: Number(f.floor) || 1,
      isGroundFloor: f.isGroundFloor,
      hasElevator: f.hasElevator,
      hasBalcony: f.hasBalcony,
      sunPosition: f.sunPosition as SunPosition,
      hasPool: f.aptHasPool,
    };
  } else if (f.type === PropertyType.LAND) {
    base.land = {
      zoning: f.zoning as Zoning,
      topography: f.topography as Topography,
    };
  } else if (f.type === PropertyType.SMALL_FARM) {
    base.smallFarm = {
      hasHouse: f.hasHouse,
      hasPool: f.sfHasPool,
      hasLake: f.hasLake,
      hasFruitTrees: f.hasFruitTrees,
      waterSource: f.waterSource as WaterSource,
    };
  } else if (f.type === PropertyType.COUNTRY_HOUSE) {
    base.countryHouse = { hasRiver: f.hasRiver, hasSpring: f.hasSpring };
  }

  return base;
}

// ─── Edit mode hydration ─────────────────────────────────────────────────────
function propertyToFormState(p: PropertyDetailDto): FormState {
  const base: FormState = {
    ...INITIAL,
    type: p.type,
    businessType: p.businessType,
    saleTypes: p.saleTypes.map((s) => s.type),
    price: p.price ?? '',
    rentPrice: p.rentPrice ?? '',
    condoFee: p.condoFee ?? '',
    whatsappContact: p.whatsappContact ?? '',
    description: p.description,
    city: p.city,
    state: p.state,
    neighborhood: p.neighborhood,
    bedrooms: p.bedrooms != null ? String(p.bedrooms) : '',
    bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
    suites: p.suites != null ? String(p.suites) : '',
    parkingSpaces: p.parkingSpaces != null ? String(p.parkingSpaces) : '',
    totalArea: p.totalArea != null ? String(p.totalArea) : '',
    builtArea: p.builtArea != null ? String(p.builtArea) : '',
  };

  const d = p.details;
  if (p.type === PropertyType.HOUSE && d) {
    const h = d as import('../types/api').HouseDetailsDto;
    base.floors = h.floors != null ? String(h.floors) : '1';
    base.isInCondominium = h.isInCondominium;
    base.condominiumName = h.condominiumName ?? '';
    base.condominiumAmenities = h.condominiumAmenities ?? '';
  } else if (p.type === PropertyType.APARTMENT && d) {
    const a = d as import('../types/api').ApartmentDetailsDto;
    base.floor = String(a.floor);
    base.isGroundFloor = a.isGroundFloor ?? false;
    base.hasElevator = a.hasElevator;
    base.hasBalcony = a.hasBalcony;
    base.sunPosition = a.sunPosition;
    base.aptHasPool = a.hasPool ?? false;
  } else if (p.type === PropertyType.LAND && d) {
    const l = d as import('../types/api').LandDetailsDto;
    base.zoning = l.zoning;
    base.topography = l.topography;
  } else if (p.type === PropertyType.SMALL_FARM && d) {
    const sf = d as import('../types/api').SmallFarmDetailsDto;
    base.waterSource = sf.waterSource;
    base.hasHouse = sf.hasHouse;
    base.sfHasPool = sf.hasPool;
    base.hasLake = sf.hasLake;
    base.hasFruitTrees = sf.hasFruitTrees;
  } else if (p.type === PropertyType.COUNTRY_HOUSE && d) {
    const ch = d as import('../types/api').CountryHouseDetailsDto;
    base.hasRiver = ch.hasRiver;
    base.hasSpring = ch.hasSpring;
  }

  return base;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PropertyForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data: existingProperty, isLoading: loadingProperty } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchPropertyById(id!),
    enabled: isEdit && Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  if (isEdit && loadingProperty) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-action" />
      </div>
    );
  }

  return (
    <PropertyFormInner key={id ?? 'new'} id={id} isEdit={isEdit} initialData={existingProperty} />
  );
}

function PropertyFormInner({
  id,
  isEdit,
  initialData,
}: {
  id: string | undefined;
  isEdit: boolean;
  initialData: PropertyDetailDto | undefined;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() =>
    initialData ? propertyToFormState(initialData) : INITIAL,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(): string {
    if (step === 1) {
      if (!form.type) return 'Selecione o tipo do imóvel.';
      if (!form.businessType) return 'Selecione o tipo de negócio.';
      if (form.businessType === BusinessType.SALE && form.saleTypes.length === 0)
        return 'Selecione ao menos uma modalidade de venda.';
      if (!form.price) return 'Informe o preço.';
      if (!form.description) return 'Informe a descrição.';
    }
    if (step === 2) {
      if (!form.city) return 'Informe a cidade.';
      if (!form.state) return 'Informe o estado.';
      if (!form.neighborhood) return 'Informe o bairro.';
    }
    if (step === 3) {
      if (form.type === PropertyType.APARTMENT) {
        if (!form.sunPosition) return 'Selecione a posição do sol.';
        if (!form.floor) return 'Informe o andar.';
      }
      if (form.type === PropertyType.LAND) {
        if (!form.zoning) return 'Selecione o zoneamento.';
        if (!form.topography) return 'Selecione a topografia.';
      }
      if (form.type === PropertyType.SMALL_FARM && !form.waterSource)
        return 'Selecione a fonte de água.';
    }
    return '';
  }

  async function handleNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError('');

    if (step === 3) {
      setSaving(true);
      try {
        const payload = buildPayload(form);
        if (isEdit && id) {
          await updateProperty(id, payload);
          navigate(`/properties/${id}/gallery`);
        } else {
          const created = await createProperty(payload);
          navigate(`/properties/${created.id}/gallery`);
        }
      } catch (e: unknown) {
        const msg = (e as { message?: string })?.message;
        setError(typeof msg === 'string' ? msg : 'Erro ao salvar imóvel.');
        setSaving(false);
      }
      return;
    }

    setStep((s) => s + 1);
  }

  return (
    <div data-slot="page-property-form" className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <PageContainer className="sticky top-0 z-10 flex items-center gap-3 bg-background pt-[env(safe-area-inset-top,16px)] pb-3">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          className="flex size-11 items-center justify-center rounded-full"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <span className="text-base font-semibold text-foreground">
            {isEdit ? 'Editar imóvel' : 'Novo imóvel'}
          </span>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={twMerge(
                  'h-1 flex-1 rounded-full transition-colors',
                  s <= step ? 'bg-action' : 'bg-border',
                )}
              />
            ))}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{step}/3</span>
      </PageContainer>

      {/* Content */}
      <PageContainer className="flex-1 overflow-y-auto pb-28">
        <div className="flex flex-col gap-5 py-2">
          {step === 1 && <Step1 form={form} set={set} />}
          {step === 2 && <Step2 form={form} set={set} />}
          {step === 3 && <Step3 form={form} set={set} />}

          {error && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </PageContainer>

      {/* Footer */}
      <PageContainer className="fixed inset-x-0 bottom-0 z-40 bg-background/90 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] pt-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white disabled:opacity-60"
        >
          {saving
            ? 'Salvando...'
            : step === 3
              ? isEdit
                ? 'Salvar alterações'
                : 'Criar e ir para fotos'
              : 'Continuar'}
        </button>
      </PageContainer>
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────
type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
      {...rest}
    />
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | '';
  onChange: (v: T) => void;
  placeholder?: string;
  options: { label: string; value: T }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground outline-none focus:border-action"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface-raised px-4"
    >
      <span className="text-sm text-foreground">{label}</span>
      <div
        className={twMerge(
          'relative h-6 w-11 rounded-full transition-colors',
          value ? 'bg-action' : 'bg-border',
        )}
      >
        <div
          className={twMerge(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </div>
    </button>
  );
}

// ─── Step 1: Basic info ───────────────────────────────────────────────────────
function Step1({ form, set }: { form: FormState; set: Setter }) {
  const typeOptions = Object.values(PropertyType).map((v) => ({
    label: PropertyTypeLabel[v],
    value: v,
  }));

  return (
    <>
      <Field label="Tipo de imóvel">
        <Select
          value={form.type}
          onChange={(v) => set('type', v)}
          options={typeOptions}
          placeholder="Selecione..."
        />
      </Field>

      <Field label="Tipo de negócio">
        <div className="grid grid-cols-2 gap-2">
          {[BusinessType.SALE, BusinessType.RENT].map((bt) => (
            <button
              key={bt}
              type="button"
              onClick={() => set('businessType', bt)}
              className={twMerge(
                'h-12 rounded-xl border text-sm font-medium transition-colors',
                form.businessType === bt
                  ? 'border-action bg-action/10 text-action'
                  : 'border-border bg-surface-raised text-foreground',
              )}
            >
              {BusinessTypeLabel[bt]}
            </button>
          ))}
        </div>
      </Field>

      {form.businessType === BusinessType.SALE && (
        <Field label="Modalidade de venda">
          <div className="flex flex-wrap gap-2">
            {Object.values(SaleType).map((st) => {
              const sel = form.saleTypes.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    set(
                      'saleTypes',
                      sel ? form.saleTypes.filter((s) => s !== st) : [...form.saleTypes, st],
                    )
                  }
                  className={twMerge(
                    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    sel
                      ? 'border-action bg-action/10 text-action'
                      : 'border-border bg-surface-raised text-foreground',
                  )}
                >
                  {SaleTypeLabel[st]}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Preço (R$)">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Ex: 450000"
          value={form.price}
          onChange={(v) => set('price', v)}
        />
      </Field>

      {form.businessType === BusinessType.RENT && (
        <Field label="Valor do aluguel (R$)">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Ex: 2500"
            value={form.rentPrice}
            onChange={(v) => set('rentPrice', v)}
          />
        </Field>
      )}

      <Field label="Condomínio (R$) — opcional">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Ex: 800"
          value={form.condoFee}
          onChange={(v) => set('condoFee', v)}
        />
      </Field>

      <Field label="WhatsApp de contato — opcional">
        <Input
          type="tel"
          inputMode="numeric"
          placeholder="Ex: 15988193239"
          value={form.whatsappContact}
          onChange={(v) => set('whatsappContact', v)}
        />
      </Field>

      <Field label="Descrição *">
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          placeholder="Descreva o imóvel..."
          className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action resize-none"
        />
      </Field>
    </>
  );
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────
function Step2({ form, set }: { form: FormState; set: Setter }) {
  return (
    <>
      <Field label="Cidade *">
        <Input placeholder="Ex: Sorocaba" value={form.city} onChange={(v) => set('city', v)} />
      </Field>
      <Field label="Estado *">
        <Input
          placeholder="Ex: SP"
          value={form.state}
          onChange={(v) => set('state', v)}
          maxLength={2}
        />
      </Field>
      <Field label="Bairro *">
        <Input
          placeholder="Ex: Centro"
          value={form.neighborhood}
          onChange={(v) => set('neighborhood', v)}
        />
      </Field>
    </>
  );
}

// ─── Step 3: Characteristics ──────────────────────────────────────────────────
function Step3({ form, set }: { form: FormState; set: Setter }) {
  const bathroomsNum = form.bathrooms ? Number(form.bathrooms) : undefined;

  return (
    <>
      {/* General specs */}
      <div className="grid grid-cols-2 gap-3">
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
        <Field label="Área total (m²)">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.totalArea}
            onChange={(v) => set('totalArea', v)}
          />
        </Field>
        <Field label="Área construída (m²)">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={form.builtArea}
            onChange={(v) => set('builtArea', v)}
          />
        </Field>
      </div>

      {/* Type-specific */}
      {form.type === PropertyType.HOUSE && <HouseFields form={form} set={set} />}
      {form.type === PropertyType.APARTMENT && <ApartmentFields form={form} set={set} />}
      {form.type === PropertyType.LAND && <LandFields form={form} set={set} />}
      {form.type === PropertyType.SMALL_FARM && <SmallFarmFields form={form} set={set} />}
      {form.type === PropertyType.COUNTRY_HOUSE && <CountryHouseFields form={form} set={set} />}
    </>
  );
}

function HouseFields({ form, set }: { form: FormState; set: Setter }) {
  return (
    <>
      <Field label="Número de andares *">
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

function ApartmentFields({ form, set }: { form: FormState; set: Setter }) {
  const sunOptions = Object.values(SunPosition).map((v) => ({
    label: SunPositionLabel[v],
    value: v,
  }));
  return (
    <>
      <Toggle
        label="É térreo"
        value={form.isGroundFloor}
        onChange={(v) => set('isGroundFloor', v)}
      />
      {!form.isGroundFloor && (
        <Field label="Andar *">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Ex: 4"
            value={form.floor}
            onChange={(v) => set('floor', v)}
          />
        </Field>
      )}
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

function LandFields({ form, set }: { form: FormState; set: Setter }) {
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

function SmallFarmFields({ form, set }: { form: FormState; set: Setter }) {
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

function CountryHouseFields({ form, set }: { form: FormState; set: Setter }) {
  return (
    <>
      <Toggle label="Tem rio" value={form.hasRiver} onChange={(v) => set('hasRiver', v)} />
      <Toggle label="Tem nascente" value={form.hasSpring} onChange={(v) => set('hasSpring', v)} />
    </>
  );
}
