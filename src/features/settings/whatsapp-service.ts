import { apiFetch } from '@/shared/api/api-client';
import type { WhatsappNumber, CreateWhatsappNumberDto } from '@/shared/api/types';

// Estas quatro chamadas já enviaram um header `x-admin-secret`, lido de
// `VITE_ADMIN_SECRET`. Era inerte: `/whatsapp-numbers` é protegido só por `JwtGuard`
// no backend, e o `AdminSecretGuard` existe num único lugar — `POST /auth/register`.
//
// Saiu por dois motivos além de ser morto. Definir `VITE_ADMIN_SECRET` em produção
// publicaria o segredo do cadastro dentro do bundle, e o header só existia para dar
// a alguém essa ideia. E um header fora da lista segura de CORS tira o `GET` da
// categoria de requisição simples, somando um preflight a cada carregamento da tela
// de configurações — para mandar um valor que o servidor descarta.

export async function fetchWhatsappNumbers() {
  return apiFetch<WhatsappNumber[]>('/whatsapp-numbers');
}

export async function createWhatsappNumber(payload: CreateWhatsappNumberDto) {
  return apiFetch<WhatsappNumber>('/whatsapp-numbers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWhatsappNumber(id: string, payload: Partial<CreateWhatsappNumberDto>) {
  return apiFetch<WhatsappNumber>(`/whatsapp-numbers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteWhatsappNumber(id: string) {
  return apiFetch<void>(`/whatsapp-numbers/${id}`, {
    method: 'DELETE',
  });
}
