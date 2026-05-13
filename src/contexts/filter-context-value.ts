import { createContext } from 'react';
import type { PropertyFilters } from '../types/filters';

export interface FilterContextValue {
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  updateFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;
}

export const FilterContext = createContext<FilterContextValue | null>(null);
