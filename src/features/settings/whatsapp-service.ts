import { apiFetch } from '@/shared/api/api-client';
import type { WhatsappNumber, CreateWhatsappNumberDto } from '@/shared/api/types';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? '';

function adminHeaders() {
  return { 'x-admin-secret': ADMIN_SECRET };
}

export async function fetchWhatsappNumbers() {
  return apiFetch<WhatsappNumber[]>('/whatsapp-numbers', { headers: adminHeaders() });
}

export async function createWhatsappNumber(payload: CreateWhatsappNumberDto) {
  return apiFetch<WhatsappNumber>('/whatsapp-numbers', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateWhatsappNumber(id: string, payload: Partial<CreateWhatsappNumberDto>) {
  return apiFetch<WhatsappNumber>(`/whatsapp-numbers/${id}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteWhatsappNumber(id: string) {
  return apiFetch<void>(`/whatsapp-numbers/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
}
