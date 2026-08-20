import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/mocks/server';
import { ToastProvider } from '@/ui/toast';
import { PropertyStatus } from '@/shared/api/types';
import type { PropertyCardDto, PropertyListResponseDto } from '@/shared/api/types';
import { propertyKeys } from '@/features/properties/query-keys';
import { useUpdatePropertyStatus } from './use-property-mutations';

/**
 * The optimistic status update is the most intricate piece of the data layer, and the
 * behaviour worth pinning is not "the cache changes" but *which value it settles on*:
 * the backend resolves `INACTIVE → ACTIVE` to `PENDING` when a property has no photos,
 * so trusting the requested value would flash the wrong badge.
 */

const LIST_FILTERS = { take: 12, skip: 0 };

function card(overrides: Partial<PropertyCardDto> = {}): PropertyCardDto {
  return {
    id: 'prop-1',
    code: '575301',
    type: 'HOUSE',
    businessType: 'SALE',
    price: '450000.00',
    rentPrice: null,
    city: 'Sorocaba',
    state: 'SP',
    neighborhood: 'Campolim',
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    previewImages: [],
    status: PropertyStatus.INACTIVE,
    ...overrides,
  } as PropertyCardDto;
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // Seed a cached list page and the status tallies, the way the dashboard would.
  queryClient.setQueryData<PropertyListResponseDto>(propertyKeys.list(LIST_FILTERS), {
    data: [card(), card({ id: 'prop-2', code: '575302', status: PropertyStatus.ACTIVE })],
    total: 2,
    skip: 0,
    take: 12,
  });
  queryClient.setQueryData(propertyKeys.statusCounts(), {
    [PropertyStatus.ACTIVE]: 1,
    [PropertyStatus.PENDING]: 0,
    [PropertyStatus.INACTIVE]: 1,
  });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  }

  const { result } = renderHook(() => useUpdatePropertyStatus(), { wrapper });

  const cachedStatus = (id: string) =>
    queryClient
      .getQueryData<PropertyListResponseDto>(propertyKeys.list(LIST_FILTERS))
      ?.data.find((p) => p.id === id)?.status;

  const cachedCounts = () =>
    queryClient.getQueryData<Record<PropertyStatus, number>>(propertyKeys.statusCounts());

  return { queryClient, result, cachedStatus, cachedCounts };
}

describe('useUpdatePropertyStatus', () => {
  it('aplica o novo status no cache antes da resposta chegar', async () => {
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.patch('/api/properties/:id/status', async ({ params }) => {
        await blocked;
        return HttpResponse.json({ id: params.id, status: PropertyStatus.ACTIVE });
      }),
    );

    const { result, cachedStatus, cachedCounts } = setup();

    result.current.mutate({ id: 'prop-1', status: PropertyStatus.ACTIVE });

    // Optimismo: já mudou, com a requisição ainda pendurada.
    await waitFor(() => expect(cachedStatus('prop-1')).toBe(PropertyStatus.ACTIVE));
    expect(cachedCounts()).toMatchObject({
      [PropertyStatus.ACTIVE]: 2,
      [PropertyStatus.INACTIVE]: 0,
    });
    // A outra linha não é tocada.
    expect(cachedStatus('prop-2')).toBe(PropertyStatus.ACTIVE);

    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('grava o status que o servidor devolveu, não o que foi pedido', async () => {
    // Cenário real: o imóvel não tem fotos, então o backend resolve
    // INACTIVE → ACTIVE para PENDING (status é derivado da contagem de fotos).
    server.use(
      http.patch('/api/properties/:id/status', ({ params }) =>
        HttpResponse.json({ id: params.id, status: PropertyStatus.PENDING }),
      ),
    );

    const { result, cachedStatus } = setup();

    result.current.mutate({ id: 'prop-1', status: PropertyStatus.ACTIVE });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(cachedStatus('prop-1')).toBe(PropertyStatus.PENDING));
  });

  it('desfaz o optimismo quando a requisição falha', async () => {
    server.use(
      http.patch('/api/properties/:id/status', () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Transição inválida.', error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    );

    const { result, cachedStatus, cachedCounts } = setup();

    result.current.mutate({ id: 'prop-1', status: PropertyStatus.ACTIVE });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(cachedStatus('prop-1')).toBe(PropertyStatus.INACTIVE));
    expect(cachedCounts()).toMatchObject({
      [PropertyStatus.ACTIVE]: 1,
      [PropertyStatus.INACTIVE]: 1,
    });
  });

  it('anuncia a falha — a mensagem do backend não pode ser engolida', async () => {
    server.use(
      http.patch('/api/properties/:id/status', () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Transição inválida.', error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    );

    const { result } = setup();
    result.current.mutate({ id: 'prop-1', status: PropertyStatus.ACTIVE });

    // O toast é renderizado pelo ToastProvider do wrapper; role="alert" é o contrato.
    await waitFor(() => {
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'Transição inválida.',
      );
    });
  });

  it('expõe variables durante o pending, para o card saber que é ele', async () => {
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.patch('/api/properties/:id/status', async ({ params }) => {
        await blocked;
        return HttpResponse.json({ id: params.id, status: PropertyStatus.ACTIVE });
      }),
    );

    const { result } = setup();
    result.current.mutate({ id: 'prop-1', status: PropertyStatus.ACTIVE });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.variables?.id).toBe('prop-1');

    release();
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
