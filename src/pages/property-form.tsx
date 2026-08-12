import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, MapPin, ArrowRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { apiFetch } from '@/shared/api/api-client';
import { cn } from '@/shared/cn';
import { onlyDigits } from '@/shared/digits';
import { formatPrice } from '@/shared/format';
import { PageContainer } from '@/layout/page-container';
import { Button } from '@/ui/button';
import { Field as SharedField } from '@/ui/field';
import { Input as SharedInput } from '@/ui/input';
import { Select as SharedSelect } from '@/ui/select';
import {
  PropertyTypeLabel,
  BusinessTypeLabel,
  SaleTypeLabel,
  SunPositionLabel,
  ZoningLabel,
  TopographyLabel,
  WaterSourceLabel,
  toPlaceCase,
} from '@/shared/format';
import {
  PropertyType,
  BusinessType,
  SaleType,
  SunPosition,
  Zoning,
  Topography,
  WaterSource,
} from '@/shared/api/types';
import {
  createProperty,
  updateProperty,
  fetchPropertyById,
} from '@/features/properties/api/property-service';
import { useDisablePullToRefresh } from '@/shared/hooks/use-disable-pull-to-refresh';
import type { CreatePropertyDto, PropertyDetailDto } from '@/shared/api/types';
import {
  propertyFormSchema,
  STEP_FIELDS,
  type PropertyFormValues,
} from '@/features/properties/property.schema';
import { getErrorMessage } from '@/shared/api/api-error';
import { propertyKeys } from '@/features/properties/query-keys';

// ─── Form state ──────────────────────────────────────────────────────────────
// Same shape react-hook-form validates via zodResolver(propertyFormSchema) —
// kept as a local alias so the step components below (which predate the Zod
// migration) don't need to change a single prop type.
type FormState = PropertyFormValues;

const INITIAL: FormState = {
  type: '',
  businessType: '',
  saleTypes: [],
  price: '',
  rentPrice: '',
  condoFee: '',
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
  latitude: null,
  longitude: null,
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function n(v: string): number | undefined {
  return v ? Number(v) : undefined;
}

function buildPayload(f: FormState): CreatePropertyDto {
  const base: CreatePropertyDto = {
    type: f.type as PropertyType,
    businessType: f.businessType as BusinessType,
    neighborhood: f.neighborhood.trim(),
    city: f.city.trim(),
    state: f.state.trim().toUpperCase(),
    description: f.description,
    ...(f.businessType === BusinessType.SALE && { price: f.price }),
    ...(f.businessType === BusinessType.SALE &&
      f.saleTypes.length > 0 && { saleTypes: f.saleTypes }),
    ...(f.businessType === BusinessType.RENT && { rentPrice: f.rentPrice }),
    ...(f.condoFee && { condoFee: f.condoFee }),
    ...(f.bedrooms && { bedrooms: n(f.bedrooms) }),
    ...(f.bathrooms && { bathrooms: n(f.bathrooms) }),
    ...(f.suites && { suites: n(f.suites) }),
    ...(f.parkingSpaces && { parkingSpaces: n(f.parkingSpaces) }),
    ...(f.totalArea && { totalArea: n(f.totalArea) }),
    ...(f.builtArea && { builtArea: n(f.builtArea) }),
    ...(f.latitude !== null &&
      f.longitude !== null && {
        latitude: f.latitude,
        longitude: f.longitude,
      }),
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
      floor: f.isGroundFloor ? 0 : Number(f.floor) || 1,
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
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
  };

  const d = p.details;
  if (p.type === PropertyType.HOUSE && d) {
    const h = d as import('@/shared/api/types').HouseDetailsDto;
    base.floors = h.floors != null ? String(h.floors) : '1';
    base.isInCondominium = h.isInCondominium;
    base.condominiumName = h.condominiumName ?? '';
    base.condominiumAmenities = h.condominiumAmenities ?? '';
  } else if (p.type === PropertyType.APARTMENT && d) {
    const a = d as import('@/shared/api/types').ApartmentDetailsDto;
    base.floor = String(a.floor);
    base.isGroundFloor = a.isGroundFloor ?? false;
    base.hasElevator = a.hasElevator;
    base.hasBalcony = a.hasBalcony;
    base.sunPosition = a.sunPosition;
    base.aptHasPool = a.hasPool ?? false;
  } else if (p.type === PropertyType.LAND && d) {
    const l = d as import('@/shared/api/types').LandDetailsDto;
    base.zoning = l.zoning;
    base.topography = l.topography;
  } else if (p.type === PropertyType.SMALL_FARM && d) {
    const sf = d as import('@/shared/api/types').SmallFarmDetailsDto;
    base.waterSource = sf.waterSource;
    base.hasHouse = sf.hasHouse;
    base.sfHasPool = sf.hasPool;
    base.hasLake = sf.hasLake;
    base.hasFruitTrees = sf.hasFruitTrees;
  } else if (p.type === PropertyType.COUNTRY_HOUSE && d) {
    const ch = d as import('@/shared/api/types').CountryHouseDetailsDto;
    base.hasRiver = ch.hasRiver;
    base.hasSpring = ch.hasSpring;
  }

  return base;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PropertyForm() {
  useDisablePullToRefresh();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  // Shares the cache entry with `useProperty` via the key factory rather than a raw
  // `['property', id]` tuple — otherwise this is a second, parallel entry that the
  // property mutations never invalidate, so editing right after a status change would
  // hydrate the form from stale data.
  //
  // It stays a plain `useQuery` instead of calling `useProperty`, deliberately:
  // `useProperty` seeds `placeholderData` from a list card, which would populate the
  // form with a partial record (empty description, missing subtype details) and let the
  // user submit it as if it were complete.
  const { data: existingProperty, isLoading: loadingProperty } = useQuery({
    queryKey: propertyKeys.detail(id ?? ''),
    queryFn: () => fetchPropertyById(id!),
    enabled: isEdit && Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  if (isEdit && loadingProperty) {
    return (
      <div className="flex min-h-dvh items-center justify-center md:min-h-full">
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
  const location = useLocation();
  const locationState = location.state as { context?: string; dashboardSearch?: string } | null;
  const fromContext = locationState?.context;
  // Carried from `PropertyAdminCard` when opened from a filtered dashboard (e.g.
  // `?status=PENDING`), so "Voltar" and "Salvar" return to that same filtered view instead
  // of resetting it. Empty when the wizard wasn't reached from the dashboard.
  const dashboardSearch = locationState?.dashboardSearch ?? '';
  const [step, setStep] = useState(1);
  const methods = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: initialData ? propertyToFormState(initialData) : INITIAL,
  });
  const { handleSubmit, watch, setValue, getValues } = methods;
  // Reactive snapshot of the whole form — same read pattern the step
  // components already used against the old local `form` state, so Step1/
  // Step2/Step3 and the type-specific field groups don't need any changes.
  // watch() defeats React Compiler's memoization analysis; the compiler isn't
  // enabled in this project's build (see CLAUDE.md), so this is a no-op today.
  // eslint-disable-next-line react-hooks/incompatible-library
  const form = watch();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitCount, setSubmitCount] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!error) return;
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [error, submitCount]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    // react-hook-form's setValue() infers its value type per literal path,
    // which a generic `K extends keyof FormState` wrapper can't satisfy —
    // the runtime behavior is exactly setValue(key, value), just needs the
    // escape hatch to type-check through the generic boundary.
    setValue(key, value as never);

    // Terreno não tem quartos/banheiros/suítes/vagas/área construída — limpa
    // valores herdados de uma seleção de tipo anterior para não serem
    // enviados escondidos no payload (o backend rejeita esses campos para LAND).
    if (key === 'type' && value === PropertyType.LAND) {
      setValue('bedrooms', '');
      setValue('bathrooms', '');
      setValue('suites', '');
      setValue('parkingSpaces', '');
      setValue('builtArea', '');
    }

    // Apartamento não tem área construída — mesmo motivo acima (o backend
    // rejeita esse campo para APARTMENT).
    if (key === 'type' && value === PropertyType.APARTMENT) {
      setValue('builtArea', '');
    }
  }

  function handleMapConfirm(
    lat: number,
    lng: number,
    city: string,
    state: string,
    neighborhood: string,
  ) {
    setError('');
    setValue('latitude', lat);
    setValue('longitude', lng);
    if (city) setValue('city', city);
    if (state) setValue('state', state.toUpperCase());
    if (neighborhood) setValue('neighborhood', neighborhood);
    setMapOpen(false);
  }

  // Runs the full schema synchronously (no react-hook-form async trigger()
  // involved, so there's no risk of reading a stale formState snapshot) and
  // picks the first issue among the fields that belong to the given step.
  function firstStepError(step: 1 | 2 | 3): string | undefined {
    const result = propertyFormSchema.safeParse(getValues());
    if (result.success) return undefined;
    const stepFields = new Set<string>(STEP_FIELDS[step]);
    const issue = result.error.issues.find((i) => stepFields.has(String(i.path[0])));
    return issue?.message;
  }

  function handleNext() {
    if (step !== 3) {
      const message = firstStepError(step as 1 | 2);
      if (message) {
        setError(message);
        setSubmitCount((c) => c + 1);
        return;
      }
      setError('');
      setStep((s) => s + 1);
      return;
    }

    void submitStep3();
  }

  function handleBack() {
    if (step > 1) {
      setError('');
      setStep((s) => s - 1);
    } else {
      navigate(`/dashboard${dashboardSearch}`);
    }
  }

  async function submitStep3() {
    await handleSubmit(
      async (values) => {
        setError('');
        setSaving(true);
        try {
          const payload = buildPayload(values);
          if (isEdit && id) {
            await updateProperty(id, payload);
            if (fromContext === 'post-create') {
              navigate(`/properties/${id}/gallery`, { state: { context: 'post-create' } });
            } else {
              navigate(`/dashboard${dashboardSearch}`);
            }
          } else {
            const created = await createProperty(payload);
            navigate(`/properties/${created.id}/gallery`, {
              state: { context: 'post-create', showSplash: true },
            });
          }
        } catch (e: unknown) {
          setError(getErrorMessage(e));
          setSaving(false);
        }
      },
      () => {
        setError(firstStepError(3) ?? 'Verifique os campos preenchidos.');
        setSubmitCount((c) => c + 1);
      },
    )();
  }

  const stepLabels = ['Informações básicas', 'Localização', 'Características'];
  const submitLabel = saving
    ? 'Salvando...'
    : step === 3
      ? isEdit
        ? 'Salvar alterações'
        : 'Criar e ir para Galeria'
      : 'Continuar';

  const errorBanner = error && (
    <p
      ref={errorRef}
      role="alert"
      className="scroll-mb-28 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger md:col-span-3"
    >
      {error}
    </p>
  );

  const mapOverlay = mapOpen && (
    <LocationPickerOverlay
      onClose={() => {
        setError('');
        setMapOpen(false);
      }}
      onConfirm={handleMapConfirm}
      initialCenter={
        form.latitude !== null && form.longitude !== null
          ? [form.latitude, form.longitude]
          : undefined
      }
      initialAddress={{ city: form.city, state: form.state, neighborhood: form.neighborhood }}
    />
  );

  return (
    /*
      One composition.

      This page rendered two full trees switched on `useIsDesktop()`: a centered card on
      desktop, a sticky-header/fixed-footer stack on mobile. `Step1`/`Step2`/`Step3` were
      already shared between them — only the *chrome* differed — so the fork was buying two
      copies of a header, a field container and a footer, and nothing else. Every one of
      those three differences is a breakpoint away.
    */
    <div
      data-slot="page-property-form"
      className="flex min-h-dvh flex-col bg-background md:min-h-full md:items-center md:justify-center md:p-8"
    >
      <div className="flex w-full flex-col md:max-w-4xl md:gap-6 md:rounded-3xl md:bg-surface md:p-8 md:shadow-xl">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <PageContainer
          maxWidth="content"
          className="sticky top-0 z-(--z-sticky) flex flex-col gap-3 bg-background pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3 md:static md:gap-6 md:bg-transparent md:p-0"
        >
          <div className="flex items-center gap-3">
            {/* One back control, at every width. Keeping a labelled "Voltar" in the desktop
                footer as well put two identically-named buttons in the DOM — ambiguous for a
                screen reader, and it broke a spec that addresses the control by name. */}
            <button
              type="button"
              onClick={handleBack}
              className="flex size-14 shrink-0 items-center justify-center rounded-full transition-colors bg-border md:hover:bg-action md:hover:text-primary-foreground"
              aria-label="Voltar"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-foreground md:text-2xl md:font-bold">
                {isEdit ? 'Editar imóvel' : 'Novo imóvel'}
              </h1>

              {isEdit && initialData && form.type ? (
                <p className="mt-1 truncate text-xs text-foreground-subtle">
                  {PropertyTypeLabel[form.type]} · Cód. {initialData.code}
                </p>
              ) : (
                !isEdit &&
                step >= 2 &&
                form.type &&
                form.businessType && (
                  <p className="mt-1 truncate text-xs text-foreground-subtle">
                    {PropertyTypeLabel[form.type]} · {BusinessTypeLabel[form.businessType]}
                    {step === 3 && form.city ? ` · ${form.city}` : ''}
                  </p>
                )
              )}

              {/* Progress: three bars in the cramped mobile header, the labelled indicator
                where there is room for words. Same information, different density. */}
              <div className="mt-2 flex items-center gap-1 md:hidden">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      s <= step ? 'bg-action' : 'bg-border',
                    )}
                  />
                ))}
              </div>
            </div>

            <span className="shrink-0 text-sm text-muted-foreground md:hidden">{step}/3</span>
          </div>

          {/* Labelled indicator where there is room for words; the three bars above carry
              the same information in the cramped mobile header. */}
          <div className="hidden justify-center md:flex">
            <StepIndicator step={step} labels={stepLabels} />
          </div>
        </PageContainer>

        {/* ── Fields ────────────────────────────────────────────────────────── */}
        <PageContainer
          maxWidth="content"
          className="flex-1 pb-28 md:rounded-2xl md:bg-surface-raised md:p-8 md:pb-8"
        >
          <div
            className={cn(
              'flex flex-col gap-5 py-2 md:py-0',
              // Only step 2 uses three columns. Step 1 stays single-column so each field
              // (business type toggle, sale-type chips) gets the full row instead of being
              // squeezed into a third of it; step 3 is a long list of conditional specs and
              // stays single-column so related fields don't end up in different columns.
              step === 2 && 'md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-5',
            )}
          >
            {step === 1 && <Step1 form={form} set={set} onSubmit={handleNext} />}
            {step === 2 && (
              <Step2
                form={form}
                set={set}
                onOpenMap={() => setMapOpen(true)}
                onSubmit={handleNext}
              />
            )}
            {step === 3 && <Step3 form={form} set={set} />}
            {errorBanner}
          </div>
        </PageContainer>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <PageContainer
          maxWidth="content"
          className="fixed inset-x-0 bottom-0 z-(--z-nav) flex items-center justify-end gap-3 bg-background/90 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] pt-3 backdrop-blur-sm md:static md:bg-transparent md:p-0 md:backdrop-blur-none"
        >
          <Button
            size="lg"
            shape="pill"
            onClick={handleNext}
            disabled={saving}
            className="w-full md:h-12 md:w-auto md:rounded-xl md:text-sm"
          >
            {submitLabel}
            {!saving && step !== 3 && <ArrowRight size={18} aria-hidden="true" />}
          </Button>
        </PageContainer>
      </div>

      {mapOverlay}
    </div>
  );
}

// ─── Step indicator (desktop) ─────────────────────────────────────────────────
function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-start">
      {labels.map((label, i) => {
        const s = i + 1;
        const active = s <= step;
        return (
          <div key={label} className="flex items-start">
            <div className="flex w-24 flex-col items-center gap-2">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  active
                    ? 'border-action bg-action text-white'
                    : 'border-border text-foreground-subtle',
                )}
              >
                {s}
              </div>
              <span
                className={cn(
                  'text-center text-xs font-medium',
                  active ? 'text-action' : 'text-foreground-subtle',
                )}
              >
                {label}
              </span>
            </div>
            {s < labels.length && (
              <div
                className={cn(
                  'mx-1 mt-5 h-0.5 w-10 shrink-0',
                  s <= step ? 'bg-action' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────
type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

// Thin wrappers around the shared Field/Input/Select primitives that keep
// this file's existing controlled `value`/`onChange(v: string)` calling
// convention untouched — every Step1/Step2/Step3 call site below keeps
// working exactly as-is, only the rendered DOM/styling is now shared.
function Field({
  label,
  children,
  asGroup,
  className,
}: {
  label: string;
  children: React.ReactNode;
  /** See `ui/field.tsx` — required whenever the children are a group of controls. */
  asGroup?: boolean;
  className?: string;
}) {
  return (
    <SharedField label={label} asGroup={asGroup} className={className}>
      {children}
    </SharedField>
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
  return <SharedInput value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
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
    <SharedSelect value={value} onChange={(e) => onChange(e.target.value as T)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SharedSelect>
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
      className="flex h-12 items-center justify-between rounded-xl border border-border bg-surface-raised px-4 transition-colors md:hover:border-foreground-subtle/40"
    >
      <span className="text-sm text-foreground">{label}</span>
      <div
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          value ? 'bg-action' : 'bg-border',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-surface-raised shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </div>
    </button>
  );
}

// ─── Step 1: Basic info ───────────────────────────────────────────────────────
function Step1({ form, set, onSubmit }: { form: FormState; set: Setter; onSubmit: () => void }) {
  const typeOptions = Object.values(PropertyType).map((v) => ({
    label: PropertyTypeLabel[v],
    value: v,
  }));

  return (
    <>
      {/* Mobile keeps the closed dropdown; desktop exposes the options as chips instead
          (no more hiding a required field behind a click), toggled by CSS alone so the
          two breakpoints don't fork into separate component trees. */}
      <Field label="Tipo de imóvel *" className="md:hidden">
        <Select
          value={form.type}
          onChange={(v) => set('type', v)}
          options={typeOptions}
          placeholder="Selecione..."
        />
      </Field>

      <Field asGroup label="Tipo de imóvel *" className="hidden md:flex">
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => {
            const selected = form.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('type', opt.value)}
                className={cn(
                  'min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors',
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
      </Field>

      <Field asGroup label="Tipo de negócio *">
        <div className="grid grid-cols-2 gap-2 md:max-w-xs">
          {[BusinessType.SALE, BusinessType.RENT].map((bt) => (
            <button
              key={bt}
              type="button"
              onClick={() => set('businessType', bt)}
              className={cn(
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
        <Field asGroup label="Modalidade de venda *">
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
                  className={cn(
                    'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
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

      {form.businessType !== BusinessType.RENT && (
        <Field label="Preço *" className="md:max-w-xs">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: R$ 450.000"
            value={formatPrice(form.price)}
            onChange={(v) => set('price', onlyDigits(v))}
          />
        </Field>
      )}

      {form.businessType === BusinessType.RENT && (
        <Field label="Valor do aluguel *" className="md:max-w-xs">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: R$ 2.500"
            value={formatPrice(form.rentPrice)}
            onChange={(v) => set('rentPrice', onlyDigits(v))}
          />
        </Field>
      )}

      <Field label="Condomínio — opcional" className="md:max-w-xs">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Ex: R$ 800"
          value={formatPrice(form.condoFee)}
          onChange={(v) => set('condoFee', onlyDigits(v))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          enterKeyHint="go"
        />
      </Field>

      <span className="text-xs text-muted-foreground">
        * Campos marcados com asterisco são obrigatórios.
      </span>
    </>
  );
}

// ─── Location picker map ─────────────────────────────────────────────────────
interface GeoResult {
  neighborhood?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface LocationPickerOverlayProps {
  onClose: () => void;
  onConfirm: (lat: number, lng: number, city: string, state: string, neighborhood: string) => void;
  initialCenter?: [number, number];
  initialAddress?: { city: string; state: string; neighborhood: string };
}

function LocationPickerOverlay({
  onClose,
  onConfirm,
  initialCenter,
  initialAddress,
}: LocationPickerOverlayProps) {
  const needsGeocode =
    !initialCenter &&
    Boolean(initialAddress?.city || initialAddress?.state || initialAddress?.neighborhood);

  const [markerPos, setMarkerPos] = useState<[number, number] | null>(initialCenter ?? null);
  const [resolved, setResolved] = useState<GeoResult | null>(
    initialAddress?.city || initialAddress?.state || initialAddress?.neighborhood
      ? {
          neighborhood: initialAddress?.neighborhood || undefined,
          city: initialAddress?.city || undefined,
          state: initialAddress?.state || undefined,
        }
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(needsGeocode);
  const [geocodedCenter, setGeocodedCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!needsGeocode) return;

    let cancelled = false;

    apiFetch<{ latitude: number; longitude: number } | null>('/geocode/forward', {
      method: 'POST',
      body: JSON.stringify({
        neighborhood: initialAddress?.neighborhood ?? '',
        city: initialAddress?.city ?? '',
        state: initialAddress?.state ?? '',
      }),
    })
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setGeocodedCenter([result.latitude, result.longitude]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });

    return () => {
      cancelled = true;
    };
    // Component remounts fresh on every open (parent uses {mapOpen && <.../>}), so deps are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = useCallback(async (lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    setLoading(true);
    try {
      const result = await apiFetch<GeoResult>('/geocode/reverse', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      setResolved(result);
    } catch {
      setResolved(null);
    } finally {
      setLoading(false);
    }
  }, []);

  if (geocoding) {
    return (
      <div className="fixed inset-0 z-(--z-fixed) flex flex-col bg-background">
        <div className="flex shrink-0 items-center gap-3 bg-background px-4 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full"
            aria-label="Fechar mapa"
          >
            <ChevronLeft size={24} />
          </button>
          <p className="text-sm font-semibold text-foreground">Selecionar localização</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-action" />
        </div>
      </div>
    );
  }

  const effectiveCenter: [number, number] = initialCenter ?? geocodedCenter ?? [-23.5505, -46.6333];
  const center: LatLngExpression = markerPos ?? effectiveCenter;

  return (
    <div className="fixed inset-0 z-(--z-fixed) flex flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 bg-background px-4 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3">
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full"
          aria-label="Fechar mapa"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Selecionar localização</p>
          {loading && <p className="text-xs text-muted-foreground">Buscando endereço…</p>}
          {!loading && resolved?.city && (
            <p className="text-xs text-foreground-subtle">
              {resolved.neighborhood ? `${resolved.neighborhood}, ` : ''}
              {resolved.city} – {resolved.state}
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={18}
          />
          <MapClickHandler onClick={handleClick} />
          {markerPos && <Marker position={markerPos} />}
        </MapContainer>

        <div className="absolute inset-x-0 bottom-0 z-(--z-map-overlay) flex justify-center pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
          <button
            type="button"
            disabled={!markerPos || loading || !resolved?.neighborhood}
            onClick={() => {
              if (!markerPos || !resolved?.neighborhood) return;
              onConfirm(
                markerPos[0],
                markerPos[1],
                resolved?.city ?? '',
                resolved?.state ?? '',
                resolved?.neighborhood ?? '',
              );
            }}
            className="flex h-14 w-[90%] items-center justify-center rounded-xl bg-action text-base font-semibold text-white shadow-lg disabled:opacity-60"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Location ─────────────────────────────────────────────────────────
function Step2({
  form,
  set,
  onOpenMap,
  onSubmit,
}: {
  form: FormState;
  set: Setter;
  onOpenMap: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <Field label="Cidade *">
        <Input
          placeholder="Ex: Sorocaba"
          value={form.city}
          onChange={(v) => set('city', toPlaceCase(v))}
        />
      </Field>
      <Field label="Estado *">
        <Input
          placeholder="Ex: SP"
          value={form.state}
          onChange={(v) => set('state', v.toUpperCase())}
          maxLength={2}
        />
      </Field>
      <Field label="Bairro *">
        <Input
          placeholder="Ex: Centro"
          value={form.neighborhood}
          onChange={(v) => set('neighborhood', toPlaceCase(v))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          enterKeyHint="go"
        />
      </Field>

      <button
        type="button"
        onClick={onOpenMap}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised text-sm font-medium text-foreground transition-colors active:bg-border md:col-span-3 md:hover:bg-border/60"
      >
        <MapPin size={18} className="text-action" />
        {form.latitude !== null ? 'Alterar localização no mapa' : 'Selecionar localização no mapa'}
      </button>
    </>
  );
}

// ─── Step 3: Characteristics ──────────────────────────────────────────────────
function Step3({ form, set }: { form: FormState; set: Setter }) {
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

function HouseFields({ form, set }: { form: FormState; set: Setter }) {
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

function ApartmentFields({ form, set }: { form: FormState; set: Setter }) {
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
