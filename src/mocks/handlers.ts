import { http, HttpResponse } from 'msw';
import type {
  ApiErrorResponse,
  LoginDto,
  SiteSettings,
  UpdateSiteSettingsDto,
  WhatsappNumber,
  CreateWhatsappNumberDto,
  CreatePropertyDto,
  PropertyDetailDto,
} from '../types/api';

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

export function resetMockData() {
  mockProperty = null;
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

  http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),

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
