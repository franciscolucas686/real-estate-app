import {
  BusinessType,
  type PropertyCardDto,
  PropertyStatus,
  PropertyType,
  SaleType,
  SunPosition,
  Topography,
  WaterSource,
  Zoning,
} from '../types/api';

export const PropertyTypeLabel: Record<PropertyType, string> = {
  HOUSE: 'Casa',
  APARTMENT: 'Apartamento',
  LAND: 'Terreno',
  SMALL_FARM: 'Chácara',
  COUNTRY_HOUSE: 'Sítio',
};

export const BusinessTypeLabel: Record<BusinessType, string> = {
  SALE: 'Venda',
  RENT: 'Aluguel',
};

export const SaleTypeLabel: Record<SaleType, string> = {
  DIRECT: 'Venda direta',
  FINANCING: 'Financiamento',
  EXCHANGE: 'Permuta',
};

export const SunPositionLabel: Record<SunPosition, string> = {
  MORNING: 'Sol da manhã',
  AFTERNOON: 'Sol da tarde',
};

export const ZoningLabel: Record<Zoning, string> = {
  RESIDENTIAL: 'Residencial',
  COMMERCIAL: 'Comercial',
  MIXED: 'Misto',
};

export const TopographyLabel: Record<Topography, string> = {
  FLAT: 'Plano',
  ACCLIVITY: 'Aclive',
  DECLIVITY: 'Declive',
};

export const WaterSourceLabel: Record<WaterSource, string> = {
  WELL: 'Poço',
  SPRING: 'Nascente',
  MAINS: 'Rede pública',
};

export function formatZoning(zoning: Zoning): string {
  return `Área ${ZoningLabel[zoning]}`;
}

export function formatPrice(value: string | null): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatArea(value: number | null): string {
  if (!value) return '—';
  return `${value} m²`;
}

export function formatMainPrice(
  businessType: BusinessType,
  price: string,
  rentPrice: string | null,
): string {
  if (businessType === BusinessType.RENT) {
    return `${formatPrice(rentPrice)}/mês`;
  }
  return formatPrice(price);
}

export function buildWhatsAppUrl(contact: string, propertyCode?: string): string {
  const number = `55${contact.replace(/\D/g, '')}`;
  const message = propertyCode
    ? `Olá! Tenho interesse no imóvel de código ${propertyCode}.`
    : 'Olá! Tenho interesse em um imóvel.';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function isPending(property: PropertyCardDto): boolean {
  return property.previewImages.length === 0;
}

export const PropertyStatusLabel: Record<PropertyStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export function getStatusColors(status: PropertyStatus): { bg: string; text: string } {
  switch (status) {
    case PropertyStatus.ACTIVE:
      return { bg: 'bg-emerald-500', text: 'text-white' };
    case PropertyStatus.PENDING:
      return { bg: 'bg-amber-400', text: 'text-foreground' };
    case PropertyStatus.INACTIVE:
      return { bg: 'bg-foreground/70', text: 'text-white' };
  }
}
