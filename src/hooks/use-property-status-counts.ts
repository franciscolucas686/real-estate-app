import { useQuery } from '@tanstack/react-query';
import { fetchStatusCounts } from '../services/property-service';

export function usePropertyStatusCounts(enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: ['property-status-counts'],
    queryFn: fetchStatusCounts,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return { counts: data, isLoading };
}
