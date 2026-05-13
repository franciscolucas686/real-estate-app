import { useState, type ReactNode } from 'react';
import { FilterContext } from './filter-context-value';
import { DEFAULT_FILTERS, type PropertyFilters } from '../types/filters';

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);

  const updateFilter = <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}
