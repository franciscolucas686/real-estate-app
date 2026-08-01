import {
  BusinessType,
  type FilterPropertyDto,
  PropertyStatus,
  PropertyType,
  type SaleType,
} from '@/shared/api/types';

export interface PropertyFilters {
  businessType?: BusinessType;
  types: PropertyType[];
  saleTypes: SaleType[];
  code: string;
  city: string;
  state: string;
  neighborhood: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minTotalArea?: number;
  maxTotalArea?: number;
  minBuiltArea?: number;
  maxBuiltArea?: number;
  minParkingSpaces?: number;
  maxParkingSpaces?: number;
  sort: 'newest' | 'oldest';
}

export const DEFAULT_FILTERS: PropertyFilters = {
  businessType: undefined,
  types: [],
  saleTypes: [],
  code: '',
  city: '',
  state: '',
  neighborhood: '',
  minPrice: '',
  maxPrice: '',
  minBedrooms: undefined,
  maxBedrooms: undefined,
  minBathrooms: undefined,
  maxBathrooms: undefined,
  minTotalArea: undefined,
  maxTotalArea: undefined,
  minBuiltArea: undefined,
  maxBuiltArea: undefined,
  minParkingSpaces: undefined,
  maxParkingSpaces: undefined,
  sort: 'newest',
};

/**
 * Maps the UI filters onto the API's query DTO, dropping anything unset.
 *
 * Split into a public and an admin variant so the status decision is explicit at the
 * call site instead of hidden in a shared default. Any caller that must not see
 * unpublished inventory uses `publicFiltersToApiParams`; the dashboard, which is
 * authenticated and *does* need every status, uses `adminFiltersToApiParams`.
 */
function baseApiParams(filters: PropertyFilters, take: number): Omit<FilterPropertyDto, 'status'> {
  return {
    ...(filters.businessType && { businessType: filters.businessType }),
    ...(filters.types.length > 0 && { types: filters.types }),
    ...(filters.saleTypes.length > 0 && { saleTypes: filters.saleTypes }),
    ...(filters.code && { code: filters.code }),
    ...(filters.city && { city: filters.city }),
    ...(filters.state && { state: filters.state }),
    ...(filters.neighborhood && { neighborhood: filters.neighborhood }),
    ...(filters.minPrice && { minPrice: filters.minPrice }),
    ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
    ...(filters.minBedrooms != null && { minBedrooms: filters.minBedrooms }),
    ...(filters.maxBedrooms != null && { maxBedrooms: filters.maxBedrooms }),
    ...(filters.minBathrooms != null && { minBathrooms: filters.minBathrooms }),
    ...(filters.maxBathrooms != null && { maxBathrooms: filters.maxBathrooms }),
    ...(filters.minTotalArea != null && { minTotalArea: filters.minTotalArea }),
    ...(filters.maxTotalArea != null && { maxTotalArea: filters.maxTotalArea }),
    ...(filters.minBuiltArea != null && { minBuiltArea: filters.minBuiltArea }),
    ...(filters.maxBuiltArea != null && { maxBuiltArea: filters.maxBuiltArea }),
    ...(filters.minParkingSpaces != null && { minParkingSpaces: filters.minParkingSpaces }),
    ...(filters.maxParkingSpaces != null && { maxParkingSpaces: filters.maxParkingSpaces }),
    sort: filters.sort,
    take,
  };
}

/**
 * Storefront params. Pins `status: ACTIVE` — belt and braces alongside the backend
 * guard, so a bug in one layer doesn't expose unpublished inventory on its own.
 */
export function publicFiltersToApiParams(filters: PropertyFilters, take = 20): FilterPropertyDto {
  return { ...baseApiParams(filters, take), status: PropertyStatus.ACTIVE };
}

/**
 * Admin params. `status` is whatever the caller is filtering by, or absent to mean
 * "every status" — which is what the backend returns for an authenticated request.
 */
export function adminFiltersToApiParams(
  filters: PropertyFilters,
  take: number,
  status?: PropertyStatus,
): FilterPropertyDto {
  return { ...baseApiParams(filters, take), ...(status ? { status } : {}) };
}

/**
 * How many filters the user has actually set, for the "N filtros" badge.
 *
 * Derived from `DEFAULT_FILTERS` rather than a hand-written list of `if`s. The old
 * version enumerated fields manually and silently omitted five of them —
 * `maxBedrooms`, `maxBathrooms`, `maxParkingSpaces`, `minBuiltArea`, `maxBuiltArea` —
 * so the badge under-reported. Deriving means a new filter field is counted the moment
 * it exists, with no second place to remember to update.
 *
 * min/max pairs count once: a price range is one decision by the user, not two.
 */
const RANGE_PAIRS = [
  ['minPrice', 'maxPrice'],
  ['minBedrooms', 'maxBedrooms'],
  ['minBathrooms', 'maxBathrooms'],
  ['minTotalArea', 'maxTotalArea'],
  ['minBuiltArea', 'maxBuiltArea'],
  ['minParkingSpaces', 'maxParkingSpaces'],
] as const satisfies readonly (readonly [keyof PropertyFilters, keyof PropertyFilters])[];

function isSet(filters: PropertyFilters, key: keyof PropertyFilters): boolean {
  const value = filters[key];
  if (Array.isArray(value)) return value.length > 0;
  if (value == null || value === '') return false;
  return value !== DEFAULT_FILTERS[key];
}

export function countActiveFilters(filters: PropertyFilters): number {
  const paired = new Set<string>(RANGE_PAIRS.flat());

  let count = RANGE_PAIRS.filter(([min, max]) => isSet(filters, min) || isSet(filters, max)).length;

  (Object.keys(DEFAULT_FILTERS) as (keyof PropertyFilters)[]).forEach((key) => {
    if (paired.has(key)) return;
    if (key === 'sort') return; // ordering is not a filter
    if (isSet(filters, key)) count++;
  });

  return count;
}
