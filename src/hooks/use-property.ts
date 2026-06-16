import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPropertyById } from '../services/property-service';
import type { PropertyDetailDto, PropertyListResponseDto } from '../types/api';

export function useProperty(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchPropertyById(id),
    staleTime: 5 * 60 * 1000,
    placeholderData: () => {
      const allCached = queryClient.getQueriesData<PropertyListResponseDto>({
        queryKey: ['properties'],
      });
      for (const [, data] of allCached) {
        const card = data?.data.find((p) => p.id === id);
        if (!card) continue;

        return {
          id: card.id,
          code: card.code,
          type: card.type,
          businessType: card.businessType,
          status: card.status,
          saleTypes: [],
          price: card.price,
          rentPrice: card.rentPrice,
          condoFee: null,
          city: card.city,
          state: card.state,
          neighborhood: card.neighborhood,
          description: '',
          totalArea: null,
          builtArea: null,
          bedrooms: card.bedrooms,
          bathrooms: card.bathrooms,
          suites: null,
          parkingSpaces: card.parkingSpaces,
          gallery: {
            rooms: [],
            unassigned: card.previewImages.map((img, index) => ({
              id: img.id,
              url: img.url,
              label: null,
              order: index,
            })),
          },
          details: null,
          location: null,
          whatsappContact: null,
          userId: '',
          createdAt: '',
          updatedAt: '',
        } as PropertyDetailDto;
      }
      return undefined;
    },
  });
}
