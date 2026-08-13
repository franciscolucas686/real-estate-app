import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createProperty,
  restoreProperty,
  softDeleteProperty,
  updateProperty,
  updatePropertyStatus,
} from '@/features/properties/api/property-service';
import { propertyKeys } from '@/features/properties/query-keys';
import { getErrorMessage } from '@/shared/api/api-error';
import { useToast } from '@/ui/toast-context';
import { PropertyStatus } from '@/shared/api/types';
import type {
  CreatePropertyDto,
  PropertyCardDto,
  PropertyDetailDto,
  PropertyListResponseDto,
} from '@/shared/api/types';

/**
 * Mutations for the properties domain.
 *
 * Before this file every write was a bare `async` function inside a page with a
 * hand-rolled try/catch — three of them ending in `catch {}` on the dashboard. That
 * meant no per-item pending state, no rollback, and silent failures on delete and on
 * status changes. Everything here goes through `useMutation` so `isPending`,
 * `variables` and error handling come from one place.
 */

/** Invalidate the whole properties domain. One key now covers lists, details and counts. */
function invalidateDomain(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: propertyKeys.all });
}

/**
 * The wizard's two writes.
 *
 * Unlike every other mutation here they do **not** toast. That is the same rule stated the
 * other way round: the toast exists because the dashboard's writes fire from icon buttons
 * inside cards, where there is nowhere to put an inline message. The wizard is a full-page
 * form with an aggregated `role="alert"` banner that already carries validation errors —
 * routing API failures there keeps one error surface instead of two, and the banner sits
 * next to the fields the user has to fix. Callers read `error` off the mutation, or catch
 * `mutateAsync`.
 */
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePropertyDto) => createProperty(payload),
    onSettled: () => invalidateDomain(queryClient),
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePropertyDto> }) =>
      updateProperty(id, payload),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.detail(variables.id) });
      return invalidateDomain(queryClient);
    },
  });
}

interface StatusVariables {
  id: string;
  status: PropertyStatus;
}

interface StatusSnapshot {
  lists: [readonly unknown[], PropertyListResponseDto | undefined][];
  detail: PropertyDetailDto | undefined;
  counts: Record<PropertyStatus, number> | undefined;
}

/**
 * Status change with an optimistic update.
 *
 * Status is the one property mutation worth doing optimistically: it swaps a value
 * in place without changing how many rows exist or how they're ordered, so the cache
 * can be patched without lying about the shape of the list. Create and delete are
 * deliberately *not* optimistic — removing a card from a paginated page leaves 11
 * items and a `total` that disagrees with the server.
 *
 * The subtlety that makes `onSuccess` mandatory: the backend does not necessarily
 * apply the status you asked for. `PropertiesService.updateStatus` validates the
 * transition and resolves `INACTIVE → ACTIVE` to **`PENDING`** when the property has
 * no photos (status is derived from photo count — see the backend's CLAUDE.md). A
 * naive optimistic update would show "Ativo", then snap to "Pendente" a moment later,
 * which is worse than no optimism at all. So the server's actual value is written
 * into the cache before `onSettled` refetches.
 */
export function useUpdatePropertyStatus() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, status }: StatusVariables) => updatePropertyStatus(id, status),

    onMutate: async ({ id, status }: StatusVariables): Promise<StatusSnapshot> => {
      // Cancel in-flight fetches first, or a response that started before the patch
      // can land after it and overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: propertyKeys.all });

      const snapshot: StatusSnapshot = {
        lists: queryClient.getQueriesData<PropertyListResponseDto>({
          queryKey: propertyKeys.lists(),
        }),
        detail: queryClient.getQueryData<PropertyDetailDto>(propertyKeys.detail(id)),
        counts: queryClient.getQueryData<Record<PropertyStatus, number>>(
          propertyKeys.statusCounts(),
        ),
      };

      patchStatusInCache(queryClient, id, status, snapshot);
      return snapshot;
    },

    onError: (error, _variables, context) => {
      if (context) restoreSnapshot(queryClient, context);
      toast.error(getErrorMessage(error));
    },

    onSuccess: (updated) => {
      // The server is the authority on the resulting status — see the docblock.
      patchStatusInCache(queryClient, updated.id, updated.status, null);
      queryClient.setQueryData(propertyKeys.detail(updated.id), (prev?: PropertyDetailDto) =>
        prev ? { ...prev, status: updated.status } : prev,
      );
    },

    onSettled: () => invalidateDomain(queryClient),
  });
}

/** Writes `status` for `id` across every cached list, the detail, and the status counts. */
function patchStatusInCache(
  queryClient: QueryClient,
  id: string,
  status: PropertyStatus,
  snapshot: StatusSnapshot | null,
) {
  let previousStatus: PropertyStatus | undefined;

  queryClient.setQueriesData<PropertyListResponseDto>(
    { queryKey: propertyKeys.lists() },
    (page) => {
      if (!page) return page;
      let touched = false;
      const data = page.data.map((card: PropertyCardDto) => {
        if (card.id !== id) return card;
        touched = true;
        previousStatus ??= card.status;
        return { ...card, status };
      });
      return touched ? { ...page, data } : page;
    },
  );

  queryClient.setQueryData(propertyKeys.detail(id), (prev?: PropertyDetailDto) => {
    if (!prev) return prev;
    previousStatus ??= prev.status;
    return { ...prev, status };
  });

  // Keep the dashboard's status tallies consistent with the row the user just changed,
  // otherwise the badge flips while the counter above it still shows the old split.
  if (snapshot && previousStatus && previousStatus !== status) {
    // Bound to a const so the narrowing survives into the updater closure.
    const from = previousStatus;
    queryClient.setQueryData(
      propertyKeys.statusCounts(),
      (prev?: Record<PropertyStatus, number>) => {
        if (!prev) return prev;
        return {
          ...prev,
          [from]: Math.max(0, (prev[from] ?? 0) - 1),
          [status]: (prev[status] ?? 0) + 1,
        };
      },
    );
  }
}

function restoreSnapshot(queryClient: QueryClient, snapshot: StatusSnapshot) {
  snapshot.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
  if (snapshot.detail) {
    queryClient.setQueryData(propertyKeys.detail(snapshot.detail.id), snapshot.detail);
  }
  if (snapshot.counts) {
    queryClient.setQueryData(propertyKeys.statusCounts(), snapshot.counts);
  }
}

/**
 * Soft delete. Not optimistic on purpose: removing a row shrinks a paginated page and
 * invalidates `total`, so the honest feedback is a pending state on the control plus a
 * refetch. Callers read `isPending` together with `variables?.id` to disable just the
 * row being deleted.
 */
export function useSoftDeleteProperty() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => softDeleteProperty(id),
    onSuccess: () => toast.success('Imóvel excluído.'),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => invalidateDomain(queryClient),
  });
}

export function useRestoreProperty() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => restoreProperty(id),
    onSuccess: () => toast.success('Imóvel restaurado.'),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => invalidateDomain(queryClient),
  });
}
