import { useEffect, useState } from 'react';
import { useFilters } from '@/features/filters/use-filters';

const DEBOUNCE_MS = 300;

/**
 * Filters the user types into freely. Listed explicitly rather than derived from
 * `PropertyFilters` by type: `minPrice`/`maxPrice`/`sort` are strings too, but they are
 * driven by a slider and a select, and debouncing them would only add lag.
 */
type TextFilterKey = 'code' | 'city' | 'state' | 'neighborhood';

/**
 * Controlled binding for a free-text filter, debounced before it reaches the URL.
 *
 * Text inputs used to write to filter state on every keystroke. Now that filters live in
 * the URL that is worse in two ways: every character is a history operation, and every
 * character is a new React Query key — typing "Sorocaba" fired eight requests and threw
 * seven away.
 *
 * The input renders from local state so it stays responsive; the URL and the query catch
 * up after {@link DEBOUNCE_MS} of quiet.
 *
 * Adopting an external change (pressing "Limpar", opening a shared link, going back) is
 * done by **adjusting state during render** — React's documented pattern for deriving
 * from a changed input — rather than a sync effect, which would fire an extra render pass
 * and trips `react-hooks`' cascading-render rule. An external change deliberately wins
 * over an in-flight draft: "Limpar" clearing the field is the point of pressing it.
 */
export function useFilterTextInput(key: TextFilterKey) {
  const { filters, updateFilter } = useFilters();
  const filterValue = filters[key];

  const [value, setValue] = useState(filterValue);
  const [lastAdopted, setLastAdopted] = useState(filterValue);

  if (filterValue !== lastAdopted) {
    setLastAdopted(filterValue);
    setValue(filterValue);
  }

  useEffect(() => {
    if (value === filterValue) return;
    const timer = setTimeout(() => updateFilter(key, value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, filterValue, key, updateFilter]);

  return { value, onChange: setValue };
}
