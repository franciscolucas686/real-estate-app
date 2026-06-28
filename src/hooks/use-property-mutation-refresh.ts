import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function usePropertyMutationRefresh() {
  const queryClient = useQueryClient();
  return useCallback(
    async (propertyId?: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['property-status-counts'] }),
        ...(propertyId
          ? [queryClient.invalidateQueries({ queryKey: ['property', propertyId] })]
          : []),
      ]);
    },
    [queryClient],
  );
}
