import { http, HttpResponse } from 'msw';
import { BusinessType, PropertyStatus, PropertyType } from '@/shared/api/types';
import type {
  ApiErrorResponse,
  PropertyCardDto,
  PropertyListResponseDto,
  LoginDto,
  SiteSettings,
  UpdateSiteSettingsDto,
  WhatsappNumber,
  CreateWhatsappNumberDto,
  CreatePropertyDto,
  PropertyDetailDto,
} from '@/shared/api/types';

const VALID_LOGIN: LoginDto = { email: 'admin@example.com', password: 'secret123' };

let siteSettings: SiteSettings = {
  id: 'settings-1',
  whatsapp: '11999990000',
  email: 'contato@imobiliaria.com',
  phone: '1122223333',
  hours: 'Seg-Sex: 9h às 18h',
  updatedAt: new Date().toISOString(),
};

let whatsappNumbers: WhatsappNumber[] = [
  {
    id: 'wn-1',
    number: '11999990000',
    isActive: true,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockProperty: PropertyDetailDto | null = null;

export function setMockProperty(property: PropertyDetailDto | null) {
  mockProperty = property;
}

/**
 * In-memory catalogue backing `GET /api/properties` and `/api/properties/status-counts`.
 *
 * Filtering, paging and the status tallies are implemented here rather than stubbed with
 * a fixed payload, because the behaviour worth testing on the dashboard *is* the
 * interaction between them — that a status filter narrows the list, that `code` is applied
 * server-side, and that `total` drives the pagination.
 */
let mockProperties: PropertyCardDto[] = [];

export function setMockProperties(properties: PropertyCardDto[]) {
  mockProperties = properties;
}

export function makePropertyCard(overrides: Partial<PropertyCardDto> = {}): PropertyCardDto {
  return {
    id: 'prop-1',
    code: '575301',
    type: PropertyType.HOUSE,
    businessType: BusinessType.SALE,
    price: '450000.00',
    rentPrice: null,
    city: 'Sorocaba',
    state: 'SP',
    neighborhood: 'Campolim',
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    previewImages: [],
    status: PropertyStatus.ACTIVE,
    ...overrides,
  };
}

export function resetMockData() {
  mockProperty = null;
  mockProperties = [];
  siteSettings = {
    id: 'settings-1',
    whatsapp: '11999990000',
    email: 'contato@imobiliaria.com',
    phone: '1122223333',
    hours: 'Seg-Sex: 9h às 18h',
    updatedAt: new Date().toISOString(),
  };
  whatsappNumbers = [
    {
      id: 'wn-1',
      number: '11999990000',
      isActive: true,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function errorResponse(status: number, message: string | string[], error: string) {
  const body: ApiErrorResponse = { statusCode: status, message, error };
  return HttpResponse.json(body, { status });
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginDto;
    if (body.email === VALID_LOGIN.email && body.password === VALID_LOGIN.password) {
      return HttpResponse.json({ id: 'user-1', email: body.email, name: 'Admin' });
    }
    return errorResponse(401, 'E-mail ou senha incorretos.', 'Unauthorized');
  }),

  /**
   * The default session is "no session", which is what every page spec already assumed —
   * they assert on what an anonymous visitor sees (`property-details` requires the status
   * badge to be *absent*). It just wasn't declared: with no handler at all, MSW's
   * `onUnhandledRequest: 'error'` logged a block per test, ~30 of them on CI, and a log
   * that noisy is where a real failure hides.
   *
   * `protected-route.spec.tsx` overrides this with `server.use` for both the failing and the
   * slow-succeeding session, and per-test handlers win over these.
   */
  http.get('/api/auth/me', () => errorResponse(401, 'Não autenticado.', 'Unauthorized')),

  http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),

  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 200 })),

  http.post('/api/auth/logout-all', () =>
    HttpResponse.json({ message: 'Sessões encerradas em todos os dispositivos', count: 2 }),
  ),

  http.get('/api/site-settings', () => HttpResponse.json(siteSettings)),

  http.patch('/api/site-settings', async ({ request }) => {
    const body = (await request.json()) as UpdateSiteSettingsDto;
    siteSettings = { ...siteSettings, ...body, updatedAt: new Date().toISOString() };
    return HttpResponse.json(siteSettings);
  }),

  http.get('/api/whatsapp-numbers', () => HttpResponse.json(whatsappNumbers)),

  http.post('/api/whatsapp-numbers', async ({ request }) => {
    const body = (await request.json()) as CreateWhatsappNumberDto;
    if (!/^\d{8,15}$/.test(body.number)) {
      return errorResponse(400, ['number must match /^\\d{8,15}$/'], 'Bad Request');
    }
    const created: WhatsappNumber = {
      id: `wn-${whatsappNumbers.length + 1}`,
      number: body.number,
      isActive: body.isActive ?? true,
      order: body.order ?? whatsappNumbers.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    whatsappNumbers = [...whatsappNumbers, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete('/api/whatsapp-numbers/:id', ({ params }) => {
    whatsappNumbers = whatsappNumbers.filter((n) => n.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/properties', async ({ request }) => {
    const body = (await request.json()) as CreatePropertyDto;
    const created: PropertyDetailDto = {
      id: 'prop-1',
      code: '0001',
      type: body.type,
      businessType: body.businessType,
      status: 'PENDING',
      saleTypes: (body.saleTypes ?? []).map((t, i) => ({ id: `st-${i}`, type: t })),
      price: body.price ?? '',
      rentPrice: body.rentPrice ?? null,
      condoFee: body.condoFee ?? null,
      city: body.city,
      state: body.state,
      neighborhood: body.neighborhood,
      description: body.description,
      totalArea: body.totalArea ?? null,
      builtArea: body.builtArea ?? null,
      bedrooms: body.bedrooms ?? null,
      bathrooms: body.bathrooms ?? null,
      suites: body.suites ?? null,
      parkingSpaces: body.parkingSpaces ?? null,
      gallery: { rooms: [], unassigned: [] },
      details:
        body.house ?? body.apartment ?? body.land ?? body.smallFarm ?? body.countryHouse ?? null,
      whatsappContact: body.whatsappContact ?? null,
      location:
        body.latitude != null && body.longitude != null
          ? {
              latitude: body.latitude,
              longitude: body.longitude,
              neighborhood: body.neighborhood,
              city: body.city,
              state: body.state,
            }
          : null,
      userId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  // Declared before `/api/properties/:id` so `status-counts` isn't swallowed by the
  // dynamic segment.
  //
  // A rota é auth-aware no backend (OptionalJwtGuard): anônimo recebe só a contagem
  // de ACTIVE — que é o número da home — e autenticado recebe os três. Como a sessão
  // padrão destes mocks é "sem sessão" (ver o handler de `/api/auth/me`), o default
  // aqui é a resposta anônima; specs autenticados sobrescrevem com `server.use`.
  http.get('/api/properties/status-counts', ({ cookies }) => {
    const counts: Record<PropertyStatus, number> = {
      [PropertyStatus.ACTIVE]: 0,
      [PropertyStatus.PENDING]: 0,
      [PropertyStatus.INACTIVE]: 0,
    };
    mockProperties.forEach((property) => {
      counts[property.status] += 1;
    });

    if (!cookies.accessToken) {
      return HttpResponse.json({ [PropertyStatus.ACTIVE]: counts[PropertyStatus.ACTIVE] });
    }

    return HttpResponse.json(counts);
  }),

  http.get('/api/properties', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const code = url.searchParams.get('code');
    const skip = Number(url.searchParams.get('skip') ?? 0);
    const take = Number(url.searchParams.get('take') ?? 10);

    const filtered = mockProperties.filter((property) => {
      if (status && property.status !== status) return false;
      if (code && !property.code.includes(code)) return false;
      return true;
    });

    const body: PropertyListResponseDto = {
      data: filtered.slice(skip, skip + take),
      total: filtered.length,
      skip,
      take,
    };
    return HttpResponse.json(body);
  }),

  http.get('/api/properties/:id', ({ params }) => {
    if (mockProperty && mockProperty.id === params.id) return HttpResponse.json(mockProperty);
    return errorResponse(404, `Property ${String(params.id)} not found`, 'Not Found');
  }),

  http.post('/api/properties/:propertyId/rooms', async ({ params, request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      { id: `room-${String(params.propertyId)}-${body.name}`, name: body.name, order: 0 },
      { status: 201 },
    );
  }),
];
