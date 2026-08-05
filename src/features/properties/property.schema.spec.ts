import { describe, expect, it } from 'vitest';
import { propertyFormSchema, type PropertyFormValues } from '@/features/properties/property.schema';

// Every field must be present (it's the form's flat state, not a partial
// DTO) — this is the neutral baseline every test starts from and overrides.
function base(): PropertyFormValues {
  return {
    type: 'LAND',
    businessType: 'SALE',
    saleTypes: ['DIRECT'],
    price: '100000',
    rentPrice: '',
    condoFee: '',
    description: 'Terreno plano em ótima localização, pronto para construir.',
    city: 'Sorocaba',
    state: 'SP',
    neighborhood: 'Centro',
    bedrooms: '',
    bathrooms: '',
    suites: '',
    parkingSpaces: '',
    totalArea: '500',
    builtArea: '',
    floors: '1',
    isInCondominium: false,
    condominiumName: '',
    condominiumAmenities: '',
    floor: '',
    isGroundFloor: false,
    hasElevator: false,
    hasBalcony: false,
    sunPosition: '',
    aptHasPool: false,
    zoning: 'RESIDENTIAL',
    topography: 'FLAT',
    hasHouse: false,
    sfHasPool: false,
    hasLake: false,
    hasFruitTrees: false,
    waterSource: '',
    hasRiver: false,
    hasSpring: false,
    latitude: null,
    longitude: null,
  };
}

function errorPaths(values: PropertyFormValues): string[] {
  const result = propertyFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.map((i) => String(i.path[0]));
}

describe('propertyFormSchema — happy paths', () => {
  it('accepts a minimal valid LAND/SALE property', () => {
    expect(propertyFormSchema.safeParse(base()).success).toBe(true);
  });

  it('accepts a valid HOUSE/RENT property', () => {
    const values = base();
    values.type = 'HOUSE';
    values.businessType = 'RENT';
    values.saleTypes = [];
    values.price = '';
    values.rentPrice = '2500';
    values.floors = '2';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });

  it('accepts a valid APARTMENT that is a ground floor unit', () => {
    const values = base();
    values.type = 'APARTMENT';
    values.isGroundFloor = true;
    values.floor = '';
    values.sunPosition = 'MORNING';
    values.hasElevator = true;
    values.hasBalcony = true;
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });

  it('accepts a valid SMALL_FARM property', () => {
    const values = base();
    values.type = 'SMALL_FARM';
    values.waterSource = 'WELL';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });
});

describe('propertyFormSchema — business rules (PropertiesService.validateBusinessTypeConfig)', () => {
  it('rejects RENT with saleTypes set', () => {
    const values = base();
    values.businessType = 'RENT';
    values.rentPrice = '2000';
    values.saleTypes = ['DIRECT'];
    expect(errorPaths(values)).toContain('saleTypes');
  });

  it('rejects SALE with no saleTypes', () => {
    const values = base();
    values.saleTypes = [];
    expect(errorPaths(values)).toContain('saleTypes');
  });

  it('rejects SALE with no price', () => {
    const values = base();
    values.price = '';
    expect(errorPaths(values)).toContain('price');
  });

  it('rejects RENT with no rentPrice', () => {
    const values = base();
    values.businessType = 'RENT';
    values.saleTypes = [];
    values.rentPrice = '';
    expect(errorPaths(values)).toContain('rentPrice');
  });
});

describe('propertyFormSchema — condoFee vs price/rentPrice', () => {
  it('rejects condoFee greater than price on a SALE property', () => {
    const values = base();
    values.price = '1000';
    values.condoFee = '2000';
    expect(errorPaths(values)).toContain('condoFee');
  });

  it('rejects condoFee greater than rentPrice on a RENT property', () => {
    const values = base();
    values.businessType = 'RENT';
    values.saleTypes = [];
    values.price = '';
    values.rentPrice = '1000';
    values.condoFee = '2000';
    expect(errorPaths(values)).toContain('condoFee');
  });

  it('accepts condoFee less than price', () => {
    const values = base();
    values.price = '2000';
    values.condoFee = '500';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });
});

describe('propertyFormSchema — suites vs bathrooms (validateSuites)', () => {
  // bathrooms/suites são proibidos para LAND (ver describe abaixo), então estes
  // casos usam HOUSE — tipo em que esses campos são permitidos.
  it('rejects suites greater than bathrooms', () => {
    const values = base();
    values.type = 'HOUSE';
    values.bathrooms = '2';
    values.suites = '3';
    expect(errorPaths(values)).toContain('suites');
  });

  it('accepts suites equal to bathrooms', () => {
    const values = base();
    values.type = 'HOUSE';
    values.bathrooms = '2';
    values.suites = '2';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });
});

describe('propertyFormSchema — LAND forbidden general fields (mirrors PropertiesService.validateLandFields)', () => {
  it.each([
    ['bedrooms', '3'],
    ['bathrooms', '2'],
    ['suites', '1'],
    ['parkingSpaces', '2'],
    ['builtArea', '150'],
  ] as const)('rejects LAND with %s set', (field, value) => {
    const values = base();
    values[field] = value;
    expect(errorPaths(values)).toContain(field);
  });

  it('accepts LAND with none of those fields set', () => {
    const values = base();
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });

  it('accepts totalArea on LAND (lot size still applies)', () => {
    const values = base();
    values.totalArea = '500';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });
});

describe('propertyFormSchema — per-subtype required fields', () => {
  it('rejects HOUSE with floors below 1', () => {
    const values = base();
    values.type = 'HOUSE';
    values.floors = '0';
    expect(errorPaths(values)).toContain('floors');
  });

  it('rejects APARTMENT with no floor and not ground floor', () => {
    const values = base();
    values.type = 'APARTMENT';
    values.isGroundFloor = false;
    values.floor = '';
    values.sunPosition = 'MORNING';
    expect(errorPaths(values)).toContain('floor');
  });

  it('rejects APARTMENT with no sunPosition', () => {
    const values = base();
    values.type = 'APARTMENT';
    values.floor = '4';
    values.sunPosition = '';
    expect(errorPaths(values)).toContain('sunPosition');
  });

  it('rejects LAND with no zoning/topography', () => {
    const values = base();
    values.zoning = '';
    values.topography = '';
    const paths = errorPaths(values);
    expect(paths).toContain('zoning');
    expect(paths).toContain('topography');
  });

  it('rejects LAND with no totalArea', () => {
    const values = base();
    values.totalArea = '';
    expect(errorPaths(values)).toContain('totalArea');
  });

  it('accepts HOUSE with no totalArea (only required for LAND)', () => {
    const values = base();
    values.type = 'HOUSE';
    values.totalArea = '';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });

  it('rejects SMALL_FARM with no waterSource', () => {
    const values = base();
    values.type = 'SMALL_FARM';
    values.waterSource = '';
    expect(errorPaths(values)).toContain('waterSource');
  });

  it('rejects APARTMENT with no totalArea', () => {
    const values = base();
    values.type = 'APARTMENT';
    values.isGroundFloor = true;
    values.floor = '';
    values.sunPosition = 'MORNING';
    values.totalArea = '';
    expect(errorPaths(values)).toContain('totalArea');
  });

  it('rejects APARTMENT with builtArea set (mirrors PropertiesService.validateApartmentAreaFields)', () => {
    const values = base();
    values.type = 'APARTMENT';
    values.isGroundFloor = true;
    values.floor = '';
    values.sunPosition = 'MORNING';
    values.totalArea = '80';
    values.builtArea = '70';
    expect(errorPaths(values)).toContain('builtArea');
  });

  it('accepts APARTMENT with totalArea and no builtArea', () => {
    const values = base();
    values.type = 'APARTMENT';
    values.isGroundFloor = true;
    values.floor = '';
    values.sunPosition = 'MORNING';
    values.totalArea = '80';
    values.builtArea = '';
    expect(propertyFormSchema.safeParse(values).success).toBe(true);
  });
});

describe('propertyFormSchema — field-level shape', () => {
  it('requires type and businessType to be selected', () => {
    const values = base();
    values.type = '';
    values.businessType = '';
    const paths = errorPaths(values);
    expect(paths).toContain('type');
    expect(paths).toContain('businessType');
  });

  it('rejects a state that is not 2 uppercase letters', () => {
    const values = base();
    values.state = 'sp';
    expect(errorPaths(values)).toContain('state');
  });

  it('rejects a description shorter than 10 characters (mirrors CreatePropertyDto @MinLength(10))', () => {
    const values = base();
    values.description = 'curta';
    expect(errorPaths(values)).toContain('description');
  });

  it('rejects a non-decimal price', () => {
    const values = base();
    values.price = 'abc';
    expect(errorPaths(values)).toContain('price');
  });
});
