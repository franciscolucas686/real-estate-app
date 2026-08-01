import { useQuery } from '@tanstack/react-query';
import { fetchStatusCounts } from '@/features/properties/api/property-service';
import { propertyKeys } from '@/features/properties/query-keys';

export function usePropertyStatusCounts(enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: propertyKeys.statusCounts(),
    queryFn: fetchStatusCounts,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return { counts: data, isLoading };
}
