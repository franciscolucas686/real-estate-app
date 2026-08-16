import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/shared/cn';
import { PropertyTypeLabel, BusinessTypeLabel } from '@/shared/format';
import { PageContainer } from '@/layout/page-container';
import { Button } from '@/ui/button';
import {
  PropertyType,
  BusinessType,
  SunPosition,
  Zoning,
  Topography,
  WaterSource,
} from '@/shared/api/types';
import { StepIndicator } from '@/features/properties/components/form/step-indicator';
import { LocationPickerOverlay } from '@/features/properties/components/form/location-picker-overlay';
import { Step1 } from '@/features/properties/components/form/step-1';
import { Step2 } from '@/features/properties/components/form/step-2';
import { Step3 } from '@/features/properties/components/form/step-3';
import type { FormState } from '@/features/properties/components/form/form-state';
import { fetchPropertyById } from '@/features/properties/api/property-service';
import { useDisablePullToRefresh } from '@/shared/hooks/use-disable-pull-to-refresh';
import type { CreatePropertyDto, PropertyDetailDto, UpdatePropertyDto } from '@/shared/api/types';
import {
  propertyFormSchema,
  STEP_FIELDS,
  type PropertyFormValues,
} from '@/features/properties/property.schema';
import { getErrorMessage } from '@/shared/api/api-error';
import { propertyKeys } from '@/features/properties/query-keys';
import {
  useCreateProperty,
  useUpdateProperty,
} from '@/features/properties/hooks/use-property-mutations';

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

/**
 * Payload de edição: o de criação, mais um `null` explícito para cada campo opcional
 * que ficou vazio.
 *
 * `buildPayload` omite o que está vazio, e na criação isso é exatamente certo. Num
 * `PATCH` não é: omitir significa "mantenha o que está lá", então **esvaziar um campo
 * no formulário não fazia nada**. Apagar a taxa de condomínio, salvar e recarregar
 * devolvia a taxa; o mesmo valia para quartos, banheiros, suítes, vagas e as áreas.
 *
 * O preço do outro tipo de negócio entra pelo mesmo motivo, e o efeito é maior:
 * mudar um imóvel de venda para aluguel deixava a coluna `price` preenchida com o
 * valor antigo, que a ordenação por preço e o `price ?? rentPrice` dos cards leem
 * como se fosse o valor corrente.
 *
 * Isto depende de o backend tratar `null` como valor efetivo na validação
 * condicional — ver `effectiveValue` em `properties.service.ts`. Antes disso, um
 * `null` era gravado sem passar pela regra, que é o defeito oposto e pior.
 */
function buildUpdatePayload(f: FormState): UpdatePropertyDto {
  return {
    ...buildPayload(f),
    price: f.businessType === BusinessType.SALE ? f.price : null,
    rentPrice: f.businessType === BusinessType.RENT ? f.rentPrice : null,
    condoFee: f.condoFee || null,
    bedrooms: n(f.bedrooms) ?? null,
    bathrooms: n(f.bathrooms) ?? null,
    suites: n(f.suites) ?? null,
    parkingSpaces: n(f.parkingSpaces) ?? null,
    totalArea: n(f.totalArea) ?? null,
    builtArea: n(f.builtArea) ?? null,
  };
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

  // The two writes go through `useMutation` like every other write in the app, which is
  // what invalidates the properties cache on the way out — the edit path used to save and
  // navigate to a dashboard still holding the old row. `isPending` replaces a hand-rolled
  // `saving` flag; the failure still lands in the banner below rather than a toast, so the
  // message sits next to the fields it is about.
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();
  const saving = createMutation.isPending || updateMutation.isPending;

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
        try {
          if (isEdit && id) {
            await updateMutation.mutateAsync({ id, payload: buildUpdatePayload(values) });
            if (fromContext === 'post-create') {
              navigate(`/properties/${id}/gallery`, { state: { context: 'post-create' } });
            } else {
              navigate(`/dashboard${dashboardSearch}`);
            }
          } else {
            const created = await createMutation.mutateAsync(buildPayload(values));
            navigate(`/properties/${created.id}/gallery`, {
              state: { context: 'post-create', showSplash: true },
            });
          }
        } catch (e: unknown) {
          // `mutateAsync` rethrows, so the banner still owns the message. There is no
          // `setSaving(false)` to pair with any more — `isPending` falls on its own.
          setError(getErrorMessage(e));
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
