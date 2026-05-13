import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPropertyById } from '../services/property-service';
import type { PropertyDetailDto, PropertyListResponseDto } from '../types/api';

export function useProperty(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchPropertyById(id),
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      const cached = queryClient.getQueryData<PropertyListResponseDto>(['properties', {}]);
      const card = cached?.data.find((p) => p.id === id);
      if (!card) return undefined;

      return {
        id: card.id,
        code: card.code,
        type: card.type,
        businessType: card.businessType,
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
        whatsappContact: null,
        userId: '',
        createdAt: '',
        updatedAt: '',
      } as PropertyDetailDto;
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(['properties', {}])?.dataUpdatedAt,
  });
}
