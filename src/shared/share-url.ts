import { API_BASE } from '@/shared/api/api-client';

/**
 * O link compartilhável de um imóvel.
 *
 * Aponta para o backend, não para a SPA, e isso é deliberado: o app é servido pela Vercel
 * como um `index.html` único para toda URL, sem meta tag nenhuma, e o crawler do WhatsApp
 * não executa JavaScript — nada que o React renderize chega até ele. A rota
 * `GET /share/properties/:id` da API devolve o HTML com as Open Graph já prontas e
 * redireciona a pessoa para cá em seguida. O custo é a barra de endereço mudar depois do
 * clique.
 *
 * Mora fora de `format.ts` de propósito: depende da configuração da API, e `format.ts` é
 * importado por meia dúzia de componentes que não têm por que arrastar o cliente HTTP
 * junto.
 *
 * O `API_BASE` vem de `VITE_API_BASE_URL` e é absoluto em produção. Em desenvolvimento ele
 * é o relativo `/api` (o proxy do Vite), que não serve para um link que vai ser colado em
 * outro lugar — daí o prefixo com a origem atual.
 */
export function buildPropertyShareUrl(propertyId: string): string {
  const base = API_BASE.startsWith('http')
    ? API_BASE
    : `${window.location.origin}${API_BASE.startsWith('/') ? '' : '/'}${API_BASE}`;

  return `${base.replace(/\/$/, '')}/share/properties/${encodeURIComponent(propertyId)}`;
}
