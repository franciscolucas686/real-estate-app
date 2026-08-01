import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '@/features/properties/api/property-service';
import type { FilterPropertyDto } from '@/shared/api/types';
import { propertyKeys } from '@/features/properties/query-keys';

export function useProperties(filters: FilterPropertyDto = {}) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => fetchProperties(filters),
    staleTime: 5 * 60 * 1000,
  });
}
