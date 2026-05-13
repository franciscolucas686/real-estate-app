import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '../services/property-service';
import type { FilterPropertyDto } from '../types/api';

export function useProperties(filters: FilterPropertyDto = {}) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => fetchProperties(filters),
    staleTime: 5 * 60 * 1000,
  });
}
