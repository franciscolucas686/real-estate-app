import { z } from 'zod';
import {
  PropertyType,
  BusinessType,
  SaleType,
  SunPosition,
  Zoning,
  Topography,
  WaterSource,
} from '@/shared/api/types';

// This is the schema for the *form's* flat state (one object with every
// field, only some of which apply depending on `type`/`businessType`) — it
// mirrors property-form.tsx's existing FormState shape, not the backend's
// CreatePropertyDto wire shape (which is nested per subtype). Converting
// between the two is buildPayload()'s job, unchanged by this migration.
//
// Business rules below are ported 1:1 from two places in api-real-estate:
// - class-validator decorators on CreatePropertyDto / Create*Dto (per-field
//   shape: regex on price/rentPrice/condoFee, state format, min lengths)
// - PropertiesService.validateBusinessTypeConfig() + validateSuites(), which
//   aren't class-validator decorators at all (conditional rules can't be
//   expressed that way) but plain service-level checks — mirrored here via
//   .superRefine() for the same reason.
function zEnum<T extends Record<string, string>>(obj: T) {
  const values = Object.values(obj) as [T[keyof T], ...T[keyof T][]];
  return z.enum(values);
}

const optionalOrEnum = <T extends Record<string, string>>(obj: T) =>
  z.union([z.literal(''), zEnum(obj)]);

const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;
const optionalDecimalString = (label: string) =>
  z.string().refine((v) => v === '' || DECIMAL_RE.test(v), `${label} inválido.`);
const optionalDigitsString = (label: string) =>
  z.string().refine((v) => v === '' || /^\d+$/.test(v), `${label} deve ser um número válido.`);

export const propertyFormSchema = z
  .object({
    // Step 1
    type: optionalOrEnum(PropertyType),
    businessType: optionalOrEnum(BusinessType),
    saleTypes: z.array(zEnum(SaleType)),
    price: optionalDecimalString('Preço'),
    rentPrice: optionalDecimalString('Valor do aluguel'),
    condoFee: optionalDecimalString('Valor do condomínio'),
    description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),

    // Step 2
    city: z.string().min(2, 'Informe a cidade.'),
    state: z
      .string()
      .length(2, 'Estado deve ter 2 letras (ex: SP).')
      .regex(/^[A-Z]{2}$/, 'Estado deve ter 2 letras maiúsculas (ex: SP).'),
    neighborhood: z.string().min(2, 'Informe o bairro.'),

    // Step 3 — general specs
    bedrooms: optionalDigitsString('Quartos'),
    bathrooms: optionalDigitsString('Banheiros'),
    suites: optionalDigitsString('Suítes'),
    parkingSpaces: optionalDigitsString('Vagas'),
    totalArea: optionalDigitsString('Área total'),
    builtArea: optionalDigitsString('Área construída'),

    // House
    floors: z.string(),
    isInCondominium: z.boolean(),
    condominiumName: z.string(),
    condominiumAmenities: z.string(),

    // Apartment
    floor: z.string(),
    isGroundFloor: z.boolean(),
    hasElevator: z.boolean(),
    hasBalcony: z.boolean(),
    sunPosition: optionalOrEnum(SunPosition),
    aptHasPool: z.boolean(),

    // Land
    zoning: optionalOrEnum(Zoning),
    topography: optionalOrEnum(Topography),

    // Small farm
    hasHouse: z.boolean(),
    sfHasPool: z.boolean(),
    hasLake: z.boolean(),
    hasFruitTrees: z.boolean(),
    waterSource: optionalOrEnum(WaterSource),

    // Country house
    hasRiver: z.boolean(),
    hasSpring: z.boolean(),

    // Location
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  })
  .superRefine((f, ctx) => {
    if (f.type === '') {
      ctx.addIssue({ code: 'custom', path: ['type'], message: 'Selecione o tipo do imóvel.' });
    }
    if (f.businessType === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['businessType'],
        message: 'Selecione o tipo de negócio.',
      });
    }

    if (f.businessType === BusinessType.SALE) {
      if (f.saleTypes.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['saleTypes'],
          message: 'Selecione ao menos uma modalidade de venda.',
        });
      }
      if (!f.price) {
        ctx.addIssue({ code: 'custom', path: ['price'], message: 'Informe o preço.' });
      }
    }
    if (f.businessType === BusinessType.RENT) {
      if (f.saleTypes.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['saleTypes'],
          message: 'Propriedades de aluguel não podem ter modalidade de venda.',
        });
      }
      if (!f.rentPrice) {
        ctx.addIssue({
          code: 'custom',
          path: ['rentPrice'],
          message: 'Informe o valor do aluguel.',
        });
      }
    }

    if (f.condoFee) {
      const condoFeeNum = Number(f.condoFee);
      const referencePrice = f.businessType === BusinessType.RENT ? f.rentPrice : f.price;
      const referenceNum = Number(referencePrice);
      if (referencePrice && referenceNum > 0 && condoFeeNum > referenceNum) {
        ctx.addIssue({
          code: 'custom',
          path: ['condoFee'],
          message:
            f.businessType === BusinessType.RENT
              ? 'O valor do condomínio não pode ser maior que o valor do aluguel.'
              : 'O valor do condomínio não pode ser maior que o preço.',
        });
      }
    }

    if (f.suites && f.bathrooms) {
      if (Number(f.suites) > Number(f.bathrooms)) {
        ctx.addIssue({
          code: 'custom',
          path: ['suites'],
          message: 'Suítes não pode ser maior que o número de banheiros.',
        });
      }
    }

    if (f.type === PropertyType.HOUSE) {
      if (!f.floors || Number(f.floors) < 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['floors'],
          message: 'Número de andares deve ser pelo menos 1.',
        });
      }
    }

    if (f.type === PropertyType.APARTMENT) {
      if (!f.isGroundFloor && !f.floor) {
        ctx.addIssue({ code: 'custom', path: ['floor'], message: 'Informe o andar.' });
      }
      if (f.sunPosition === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['sunPosition'],
          message: 'Selecione a posição do sol.',
        });
      }
      if (!f.totalArea) {
        ctx.addIssue({
          code: 'custom',
          path: ['totalArea'],
          message: 'Informe a área total do apartamento.',
        });
      }
      if (f.builtArea !== '') {
        ctx.addIssue({
          code: 'custom',
          path: ['builtArea'],
          message: 'Área construída não se aplica a apartamentos.',
        });
      }
    }

    if (f.type === PropertyType.LAND) {
      if (f.zoning === '') {
        ctx.addIssue({ code: 'custom', path: ['zoning'], message: 'Selecione o zoneamento.' });
      }
      if (f.topography === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['topography'],
          message: 'Selecione a topografia.',
        });
      }
      if (!f.totalArea) {
        ctx.addIssue({
          code: 'custom',
          path: ['totalArea'],
          message: 'Informe a área total do terreno.',
        });
      }

      const landForbiddenFields = [
        ['bedrooms', 'Quartos'],
        ['bathrooms', 'Banheiros'],
        ['suites', 'Suítes'],
        ['parkingSpaces', 'Vagas'],
        ['builtArea', 'Área construída'],
      ] as const;
      for (const [field, label] of landForbiddenFields) {
        if (f[field] !== '') {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `${label} não se aplica a terrenos.`,
          });
        }
      }
    }

    if (f.type === PropertyType.SMALL_FARM && f.waterSource === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['waterSource'],
        message: 'Selecione a fonte de água.',
      });
    }
  });

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

// Field groups per wizard step, used with react-hook-form's trigger(names)
// to validate only the current step without running the whole schema's
// error display (the schema itself is always validated as a whole — Zod
// doesn't support partial validation with cross-field superRefine rules —
// trigger() just scopes which fields get their error state shown).
export const STEP_FIELDS: Record<1 | 2 | 3, (keyof PropertyFormValues)[]> = {
  1: ['type', 'businessType', 'saleTypes', 'price', 'rentPrice', 'condoFee'],
  2: ['city', 'state', 'neighborhood'],
  3: [
    'bedrooms',
    'bathrooms',
    'suites',
    'parkingSpaces',
    'totalArea',
    'builtArea',
    'floors',
    'isInCondominium',
    'condominiumName',
    'condominiumAmenities',
    'floor',
    'isGroundFloor',
    'hasElevator',
    'hasBalcony',
    'sunPosition',
    'aptHasPool',
    'zoning',
    'topography',
    'hasHouse',
    'sfHasPool',
    'hasLake',
    'hasFruitTrees',
    'waterSource',
    'hasRiver',
    'hasSpring',
    'description',
  ],
};
