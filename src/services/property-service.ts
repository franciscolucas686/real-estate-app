import { apiFetch } from './api-client';
import type {
  CreatePropertyDto,
  CreateRoomDto,
  FilterPropertyDto,
  PropertyDetailDto,
  PropertyListResponseDto,
  PropertyStatus,
  ReorderImagesDto,
} from '../types/api';

function buildQuery(params: FilterPropertyDto = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      // Use append() to create repeated params: types=HOUSE&types=APARTMENT
      value.forEach((item) => query.append(key, String(item)));
      return;
    }
    query.set(key, String(value));
  });

  return query.toString();
}

export async function fetchProperties(params: FilterPropertyDto = {}) {
  const query = buildQuery(params);
  const path = query ? `/properties?${query}` : '/properties';
  return apiFetch<PropertyListResponseDto>(path);
}

export async function fetchPropertyById(id: string) {
  return apiFetch<PropertyDetailDto>(`/properties/${id}`);
}

export async function createProperty(payload: CreatePropertyDto) {
  return apiFetch<PropertyDetailDto>('/properties', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProperty(id: string, payload: Partial<CreatePropertyDto>) {
  return apiFetch<PropertyDetailDto>(`/properties/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function softDeleteProperty(id: string) {
  return apiFetch<void>(`/properties/${id}`, {
    method: 'DELETE',
  });
}

export async function restoreProperty(id: string) {
  return apiFetch<PropertyDetailDto>(`/properties/${id}/restore`, {
    method: 'PATCH',
  });
}

export async function createRoom(propertyId: string, payload: CreateRoomDto) {
  return apiFetch<{ id: string; name: string; order: number }>(`/properties/${propertyId}/rooms`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRoom(propertyId: string, roomId: string, payload: CreateRoomDto) {
  return apiFetch(`/properties/${propertyId}/rooms/${roomId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteRoom(propertyId: string, roomId: string) {
  return apiFetch<void>(`/properties/${propertyId}/rooms/${roomId}`, {
    method: 'DELETE',
  });
}

export async function uploadPropertyImages(propertyId: string, images: File[], roomId?: string) {
  const formData = new FormData();
  images.forEach((image) => formData.append('images', image));
  if (roomId) formData.append('roomId', roomId);

  return apiFetch<{ images: unknown[]; total: number }>(`/properties/${propertyId}/images`, {
    method: 'POST',
    body: formData,
  });
}

export async function deletePropertyImage(propertyId: string, imageId: string) {
  return apiFetch<void>(`/properties/${propertyId}/images/${imageId}`, {
    method: 'DELETE',
  });
}

export async function bulkDeletePropertyImages(propertyId: string, imageIds: string[]) {
  return apiFetch<void>(`/properties/${propertyId}/images`, {
    method: 'DELETE',
    body: JSON.stringify({ imageIds }),
  });
}

export async function reorderPropertyImages(propertyId: string, payload: ReorderImagesDto) {
  return apiFetch<void>(`/properties/${propertyId}/images/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updatePropertyStatus(id: string, status: PropertyStatus) {
  return apiFetch<PropertyDetailDto>(`/properties/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function fetchStatusCounts(): Promise<Record<PropertyStatus, number>> {
  return apiFetch<Record<PropertyStatus, number>>('/properties/status-counts');
}
