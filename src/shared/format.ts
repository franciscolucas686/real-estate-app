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
} from '@/shared/api/types';

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

/**
 * Formats a decimal-string amount as BRL.
 *
 * The two empty cases are deliberately different, because the callers are:
 * - `''` → `''`, for a controlled text input. This used to fall through to
 *   `Number('') === 0` and render "R$ 0", so the price field of a new property opened
 *   pre-filled with zero and its placeholder was never visible.
 * - `null` → `'—'`, for display. `price` is null on rent-only properties, and rendering
 *   "R$ 0" there states a price that does not exist.
 */
export function formatPrice(value: string | null | undefined): string {
  if (value == null) return '—';
  if (value === '') return '';

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
  price: string | null,
  rentPrice: string | null,
): string {
  if (businessType === BusinessType.RENT) {
    return `${formatPrice(rentPrice)}/mês`;
  }
  return formatPrice(price);
}

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Adapts to landline (10 digits → 4-4) or mobile (11 digits → 5-4)
export function formatPhoneAdaptive(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
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

/**
 * Status colours come from the theme (`--color-success` / `--color-warning` /
 * `--color-neutral` in index.css), not from Tailwind's stock palette. The previous
 * `bg-emerald-500` / `bg-amber-400` lived outside `@theme`, which meant the one
 * place in the app that encodes lifecycle state was invisible to the design system
 * and would have had to be found by hand when adding a dark theme.
 */
export function getStatusColors(status: PropertyStatus): { bg: string; text: string } {
  switch (status) {
    case PropertyStatus.ACTIVE:
      return { bg: 'bg-success', text: 'text-success-foreground' };
    case PropertyStatus.PENDING:
      return { bg: 'bg-warning', text: 'text-warning-foreground' };
    case PropertyStatus.INACTIVE:
      return { bg: 'bg-neutral', text: 'text-neutral-foreground' };
  }
}

const PLACE_STOP_WORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'na',
  'no',
  'nas',
  'nos',
]);

export function toPlaceCase(value: string): string {
  return value
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && PLACE_STOP_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}
