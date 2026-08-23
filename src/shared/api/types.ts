export const PropertyType = {
  HOUSE: 'HOUSE',
  APARTMENT: 'APARTMENT',
  LAND: 'LAND',
  SMALL_FARM: 'SMALL_FARM',
  COUNTRY_HOUSE: 'COUNTRY_HOUSE',
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const BusinessType = {
  RENT: 'RENT',
  SALE: 'SALE',
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

export const SaleType = {
  DIRECT: 'DIRECT',
  FINANCING: 'FINANCING',
  EXCHANGE: 'EXCHANGE',
} as const;
export type SaleType = (typeof SaleType)[keyof typeof SaleType];

export const SunPosition = {
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON',
} as const;
export type SunPosition = (typeof SunPosition)[keyof typeof SunPosition];

export const Zoning = {
  RESIDENTIAL: 'RESIDENTIAL',
  COMMERCIAL: 'COMMERCIAL',
  MIXED: 'MIXED',
} as const;
export type Zoning = (typeof Zoning)[keyof typeof Zoning];

export const Topography = {
  FLAT: 'FLAT',
  ACCLIVITY: 'ACCLIVITY',
  DECLIVITY: 'DECLIVITY',
} as const;
export type Topography = (typeof Topography)[keyof typeof Topography];

export const WaterSource = {
  WELL: 'WELL',
  SPRING: 'SPRING',
  MAINS: 'MAINS',
} as const;
export type WaterSource = (typeof WaterSource)[keyof typeof WaterSource];

export interface PreviewImageDto {
  id: string;
  url: string;
}

export const PropertyStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export interface PropertyCardDto {
  id: string;
  code: string;
  type: PropertyType;
  businessType: BusinessType;
  /**
   * Nullable, matching the backend column: a RENT-only property has no sale price. The
   * frontend used to declare this as a plain `string`, so every consumer was told a value
   * would be there when roughly half the catalogue has `null`.
   */
  price: string | null;
  rentPrice: string | null;
  city: string;
  state: string;
  neighborhood: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;

  /*
   * Os cinco campos abaixo o backend já enviava e este tipo não declarava, então a
   * listagem não conseguia lê-los mesmo recebendo-os em toda página. Eles existem no
   * PropertyCardDto do backend de propósito — para uma listagem densa poder ser
   * renderizada sem uma segunda requisição por linha — e declará-los aqui é o que
   * torna esse propósito alcançável.
   */
  suites: number | null;
  totalArea: number | null;
  builtArea: number | null;
  condoFee: string | null;
  createdAt: string;

  /**
   * Preenchido apenas pelos cards de `GET /properties/trash`; `null` em toda listagem
   * normal. É a partir dele que a lixeira calcula quanto resta dos 30 dias de retenção.
   */
  deletedAt: string | null;

  previewImages: PreviewImageDto[];
  status: PropertyStatus;
}

export interface PropertyListResponseDto {
  data: PropertyCardDto[];
  total: number;
  skip: number;
  take: number;
}

export interface PropertyImageDto {
  id: string;
  url: string;
  label: string | null;
  order: number;
  roomName?: string;
}

export interface PropertyRoomDto {
  id: string;
  name: string;
  order: number;
  images: PropertyImageDto[];
}

export interface PropertySaleTypeDto {
  id: string;
  type: SaleType;
}

export interface PropertyLocationDto {
  latitude: number | null;
  longitude: number | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface GalleryDto {
  unassigned?: PropertyImageDto[];
  rooms: PropertyRoomDto[];
}

export interface HouseDetailsDto {
  floors: number;
  isInCondominium: boolean;
  condominiumName: string | null;
  condominiumAmenities: string | null;
}

export interface ApartmentDetailsDto {
  floor: number;
  isGroundFloor: boolean | null;
  hasElevator: boolean;
  hasBalcony: boolean;
  sunPosition: SunPosition;
  hasPool: boolean | null;
}

export interface LandDetailsDto {
  zoning: Zoning;
  topography: Topography;
}

export interface SmallFarmDetailsDto {
  hasHouse: boolean;
  hasPool: boolean;
  hasLake: boolean;
  hasFruitTrees: boolean;
  waterSource: WaterSource;
}

export interface CountryHouseDetailsDto {
  hasRiver: boolean;
  hasSpring: boolean;
}

export type PropertyDetailsDto =
  | HouseDetailsDto
  | ApartmentDetailsDto
  | LandDetailsDto
  | SmallFarmDetailsDto
  | CountryHouseDetailsDto
  | null;

export interface PropertyOwnerDto {
  name: string;
  /** Somente dígitos, sem DDI — mesma forma que `SiteSettingsDto.whatsapp`. */
  phone: string;
}

export interface PropertyDetailDto {
  id: string;
  code: string;
  type: PropertyType;
  businessType: BusinessType;
  status: PropertyStatus;
  saleTypes: PropertySaleTypeDto[];
  /** Nullable for the same reason as `PropertyCardDto.price`. */
  price: string | null;
  rentPrice: string | null;
  condoFee: string | null;
  city: string;
  state: string;
  neighborhood: string;
  description: string;
  totalArea: number | null;
  builtArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  suites: number | null;
  parkingSpaces: number | null;
  gallery: GalleryDto;
  details: PropertyDetailsDto;
  whatsappContact: string | null;
  /**
   * Contato privado do proprietário, ou `null`.
   *
   * O `null` funde dois casos de propósito, e o backend é quem decide: visitante anônimo
   * (o campo **não é serializado** — não é escondido no cliente) e imóvel anterior à
   * migração que criou as colunas. Ver `ownerContactFor` no `api-real-estate`.
   *
   * Aninhado na saída e plano na entrada (`ownerName`/`ownerPhone` em `CreatePropertyDto`):
   * a entrada espelha coluna, a saída espelha a fronteira de acesso.
   */
  owner: PropertyOwnerDto | null;
  location: PropertyLocationDto | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

/**
 * O que `GET /auth/me` devolve — os três campos, e só eles.
 *
 * `createdAt`/`updatedAt` estavam declarados aqui e nunca chegam: o handler monta
 * `{ id, email, name }` à mão. Ninguém os lia, mas um tipo que promete campos
 * inexistentes é um convite a lê-los e receber `undefined` em produção.
 *
 * `name` é anulável porque a coluna é (`name String?` no schema do Prisma) e o backend
 * repassa o `null`. Declarado como `string`, ele derrubava o dashboard inteiro:
 * `user?.name.split(' ')` protege o `user`, não o `name`, e o throw acontece durante o
 * render — o que a `ErrorBoundary` mostra como página em branco.
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
}

export interface FilterPropertyDto {
  types?: PropertyType[];
  businessType?: BusinessType;
  saleTypes?: SaleType[];
  city?: string;
  state?: string;
  neighborhood?: string;
  minPrice?: string;
  maxPrice?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minTotalArea?: number;
  maxTotalArea?: number;
  minBuiltArea?: number;
  maxBuiltArea?: number;
  minParkingSpaces?: number;
  maxParkingSpaces?: number;
  sort?: 'newest' | 'oldest';
  skip?: number;
  take?: number;
  code?: string;
  status?: PropertyStatus;
}

export interface CreatePropertyDto {
  type: PropertyType;
  businessType: BusinessType;
  saleTypes?: SaleType[];
  price?: string;
  rentPrice?: string;
  condoFee?: string;
  neighborhood: string;
  city: string;
  state: string;
  description: string;
  /** Obrigatório: todo imóvel tem dono. Ver `PropertyDetailDto.owner` para a saída. */
  ownerName: string;
  /** Obrigatório, somente dígitos e sem DDI. `@Matches(/^\d{8,15}$/)` no backend. */
  ownerPhone: string;
  totalArea?: number;
  builtArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  parkingSpaces?: number;
  latitude?: number;
  longitude?: number;
  house?: HouseDetailsDto;
  apartment?: ApartmentDetailsDto;
  land?: LandDetailsDto;
  smallFarm?: SmallFarmDetailsDto;
  countryHouse?: CountryHouseDetailsDto;
}

/**
 * Campos que o formulário de edição pode **esvaziar**, e que por isso viajam como
 * `null` explícito num PATCH em vez de serem omitidos.
 *
 * A distinção não existe na criação (ausente e vazio são a mesma coisa) e é tudo na
 * edição: `PATCH` é parcial, então omitir significa "mantenha o que está lá". Omitir
 * era o que o payload fazia com todo campo vazio — apagar a taxa de condomínio,
 * salvar, e encontrá-la de volta no recarregamento.
 */
export type ClearablePropertyField =
  | 'price'
  | 'rentPrice'
  | 'condoFee'
  | 'bedrooms'
  | 'bathrooms'
  | 'suites'
  | 'parkingSpaces'
  | 'totalArea'
  | 'builtArea';

/** Corpo de `PATCH /properties/:id`. Ver `ClearablePropertyField`. */
export type UpdatePropertyDto = Partial<Omit<CreatePropertyDto, ClearablePropertyField>> & {
  [K in ClearablePropertyField]?: CreatePropertyDto[K] | null;
};

export interface CreateRoomDto {
  name: string;
}

export interface ReorderImagesDto {
  items: {
    imageId: string;
    order: number;
    roomId?: string | null;
  }[];
}

export interface ApiErrorResponse {
  statusCode: number;
  code?: string;
  message: string | string[];
  error?: string;
}

export interface WhatsappNumber {
  id: string;
  number: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsappNumberDto {
  number: string;
  isActive?: boolean;
  order?: number;
}

export interface SiteSettings {
  id: string;
  whatsapp: string;
  email: string;
  /** Handle do Instagram, sem `@` e sem URL — ver `normalizeInstagramHandle`. */
  instagram: string;
  hours: string;
  updatedAt: string;
}

export interface UpdateSiteSettingsDto {
  whatsapp?: string;
  email?: string;
  instagram?: string;
  hours?: string;
}
