import type { FilterPropertyDto } from '@/shared/api/types';

/**
 * Hierarchical query keys for the properties domain.
 *
 * The previous keys were three unrelated siblings — `['properties', filters]`,
 * `['property', id]` and `['property-status-counts']` — so nothing could invalidate
 * "everything about properties" without listing all three by hand, which is exactly
 * what `usePropertyMutationRefresh` existed to paper over. With a shared root,
 * `invalidateQueries({ queryKey: propertyKeys.all })` covers the domain, and the
 * narrower factories still allow surgical invalidation.
 *
 * `as const` on every return matters: it keeps the tuples literal so TanStack Query's
 * partial matching (prefix comparison) behaves predictably.
 */
export const propertyKeys = {
  all: ['properties'] as const,

  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: FilterPropertyDto) => [...propertyKeys.lists(), filters] as const,

  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,

  statusCounts: () => [...propertyKeys.all, 'status-counts'] as const,

  /**
   * Sob a mesma raiz de propósito: restaurar um imóvel muda a lixeira **e** as
   * listagens, e apagar um faz o contrário. Com a raiz compartilhada, o
   * `invalidateQueries({ queryKey: propertyKeys.all })` que as mutações já disparam
   * cobre os dois lados sem ninguém precisar lembrar da lixeira.
   */
  trash: (skip: number, take: number) => [...propertyKeys.all, 'trash', skip, take] as const,
};
