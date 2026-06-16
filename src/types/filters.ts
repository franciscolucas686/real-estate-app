import { BusinessType, type FilterPropertyDto, PropertyStatus, PropertyType, type SaleType } from './api';

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

export function filtersToApiParams(filters: PropertyFilters, take = 20): FilterPropertyDto {
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
    status: PropertyStatus.ACTIVE,
  };
}

export function countActiveFilters(filters: PropertyFilters): number {
  let count = 0;
  if (filters.businessType) count++;
  if (filters.types.length > 0) count++;
  if (filters.saleTypes.length > 0) count++;
  if (filters.code) count++;
  if (filters.city) count++;
  if (filters.state) count++;
  if (filters.neighborhood) count++;
  if (filters.minPrice) count++;
  if (filters.maxPrice) count++;
  if (filters.minBedrooms != null) count++;
  if (filters.minBathrooms != null) count++;
  if (filters.minTotalArea != null || filters.maxTotalArea != null) count++;
  if (filters.minParkingSpaces != null) count++;
  return count;
}
