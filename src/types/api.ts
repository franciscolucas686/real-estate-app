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
  DRAFT: 'DRAFT',
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
  price: string;
  rentPrice: string | null;
  city: string;
  state: string;
  neighborhood: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
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

export interface PropertyDetailDto {
  id: string;
  code: string;
  type: PropertyType;
  businessType: BusinessType;
  saleTypes: PropertySaleTypeDto[];
  price: string;
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

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  price: string;
  rentPrice?: string;
  condoFee?: string;
  neighborhood: string;
  city: string;
  state: string;
  description: string;
  totalArea?: number;
  builtArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  parkingSpaces?: number;
  whatsappContact?: string;
  latitude?: number;
  longitude?: number;
  house?: HouseDetailsDto;
  apartment?: ApartmentDetailsDto;
  land?: LandDetailsDto;
  smallFarm?: SmallFarmDetailsDto;
  countryHouse?: CountryHouseDetailsDto;
}

export interface UpdatePropertyStatusDto {
  status: PropertyStatus;
}

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
  message: string | string[];
  error: string;
}

export interface WhatsappNumber {
  id: string;
  number: string;
  label: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsappNumberDto {
  number: string;
  label?: string;
  isActive?: boolean;
  order?: number;
}
