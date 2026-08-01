import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_FILTERS, type PropertyFilters } from '@/features/filters/filter-types';
import {
  parseFilters,
  serializeFilters,
  FILTER_PARAM_KEYS,
} from '@/features/filters/filter-params';

export interface UseFiltersResult {
  filters: PropertyFilters;
  /** Bulk apply — pushes a history entry, so the browser's back button undoes it. */
  setFilters: (filters: PropertyFilters) => void;
  /** Single-field change — replaces the entry, so dragging a slider doesn't fill history. */
  updateFilter: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void;
  resetFilters: () => void;
}

/**
 * Search filters, derived from the URL.
 *
 * The signature is unchanged from the `FilterProvider`-backed version on purpose — the
 * five call sites (`pages/filters`, `pages/search`, `property-list`, `filters-modal`,
 * `quick-filters`) needed no edits. What changed is where the state lives: the URL
 * instead of a React context, so a filtered search is shareable, survives a reload, and
 * is undoable with the back button. None of that worked before.
 *
 * History behaviour is split by intent, which is the part worth getting right:
 * `updateFilter` **replaces** (a slider drag or a keystroke shouldn't require twenty
 * presses of Back to escape), while `setFilters` and `resetFilters` **push** (a
 * deliberate "apply" or "clear" is exactly what a user expects Back to reverse).
 */
export function useFilters(): UseFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const write = useCallback(
    (next: PropertyFilters, replace: boolean) => {
      setSearchParams(
        (current) => {
          const params = serializeFilters(next);
          // Carry over params this module doesn't own (e.g. `page`). `serializeFilters`
          // returns only filter keys, so without this a filter change would drop
          // `?page=3` on the floor.
          current.forEach((value, key) => {
            if (!FILTER_PARAM_KEYS.has(key) && !params.has(key)) params.set(key, value);
          });
          return params;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const setFilters = useCallback((next: PropertyFilters) => write(next, false), [write]);

  const updateFilter = useCallback(
    <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => {
      write({ ...filters, [key]: value }, true);
    },
    [filters, write],
  );

  const resetFilters = useCallback(() => write(DEFAULT_FILTERS, false), [write]);

  return { filters, setFilters, updateFilter, resetFilters };
}
