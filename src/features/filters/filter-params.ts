import { z } from 'zod';
import { BusinessType, PropertyType, SaleType } from '@/shared/api/types';
import { DEFAULT_FILTERS, type PropertyFilters } from '@/features/filters/filter-types';

/**
 * Translation between `PropertyFilters` and the URL query string.
 *
 * The search state lives in the URL rather than in React state so a search is
 * shareable, survives a reload, and can be undone with the browser's back button —
 * none of which worked before, since `FilterProvider` held everything in `useState`.
 *
 * Two rules govern this module:
 *
 * 1. **A malformed URL must never break the page.** Every field is `.catch()`-ed to its
 *    default, so `?minBedrooms=abc` or a hand-edited link degrades to "filter ignored"
 *    instead of a crash or a request the API would reject with 400.
 *
 * 2. **`status` is deliberately absent.** It is not a URL-controllable filter. The
 *    public list endpoint pins anonymous callers to ACTIVE server-side (see the
 *    backend's guard), and `publicFiltersToApiParams` pins it client-side too. Adding
 *    it here would let anyone type `?status=PENDING` and re-open the unpublished
 *    inventory leak that was closed on the backend.
 */

const csv = <T extends string>(values: readonly T[]) =>
  z
    .string()
    .transform((raw) =>
      raw
        .split(',')
        .map((part) => part.trim())
        .filter((part): part is T => (values as readonly string[]).includes(part)),
    )
    .catch([] as T[]);

/** Positive integer, or the field's default when absent/garbage. */
const count = z.coerce.number().int().positive().optional().catch(undefined);

/** Decimal kept as a string, matching the API's money contract. */
const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .catch('');

const filterParamsSchema = z.object({
  businessType: z.enum(BusinessType).optional().catch(undefined),
  types: csv(Object.values(PropertyType)),
  saleTypes: csv(Object.values(SaleType)),
  // Só dígitos, como `ui/numeric-input.tsx` deixa digitar. Sem isso um `?code=abc` é
  // adotado durante o render por `useFilterTextInput` e mostra no campo um valor que o
  // próprio campo não consegue produzir. Ignorado em vez de limpo para os dígitos: `57a5`
  // virar uma busca por `575` fabrica uma consulta que ninguém pediu.
  code: z.string().trim().max(32).regex(/^\d*$/).catch(''),
  city: z.string().trim().max(80).catch(''),
  state: z.string().trim().max(2).catch(''),
  neighborhood: z.string().trim().max(80).catch(''),
  minPrice: money,
  maxPrice: money,
  minBedrooms: count,
  maxBedrooms: count,
  minBathrooms: count,
  maxBathrooms: count,
  minTotalArea: count,
  maxTotalArea: count,
  minBuiltArea: count,
  maxBuiltArea: count,
  minParkingSpaces: count,
  maxParkingSpaces: count,
  sort: z.enum(['newest', 'oldest']).catch('newest'),
});

const ARRAY_KEYS = ['types', 'saleTypes'] as const;

/**
 * The query-string keys this module owns. `useFilters` uses it to carry over unrelated
 * params (like `page`) instead of dropping them when filters change.
 */
export const FILTER_PARAM_KEYS: ReadonlySet<string> = new Set(
  Object.keys(filterParamsSchema.shape),
);

/** Reads filters out of the URL, falling back to defaults field by field. */
export function parseFilters(params: URLSearchParams): PropertyFilters {
  const raw: Record<string, string> = {};
  for (const key of Object.keys(filterParamsSchema.shape)) {
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }

  // `.catch()` per field means parsing cannot throw; the result is always complete.
  const parsed = filterParamsSchema.parse(raw);
  return { ...DEFAULT_FILTERS, ...parsed };
}

/**
 * Writes filters into a query string, omitting anything still at its default.
 *
 * Omitting defaults keeps shared links readable — without it every URL would carry
 * `?sort=newest&code=&city=…` for filters the user never touched.
 */
export function serializeFilters(filters: PropertyFilters): URLSearchParams {
  const params = new URLSearchParams();

  (Object.keys(filterParamsSchema.shape) as (keyof PropertyFilters)[]).forEach((key) => {
    const value = filters[key];
    const fallback = DEFAULT_FILTERS[key];

    if (value == null || value === '') return;

    if ((ARRAY_KEYS as readonly string[]).includes(key)) {
      const list = value as string[];
      if (list.length > 0) params.set(key, list.join(','));
      return;
    }

    if (value === fallback) return;
    params.set(key, String(value));
  });

  return params;
}

/**
 * True when the URL carries no filter at all — used to tell "no results because the
 * catalogue is empty" apart from "no results because of this filter", which are
 * different messages with different next steps.
 */
export function hasAnyFilter(filters: PropertyFilters): boolean {
  return serializeFilters(filters).size > 0;
}
