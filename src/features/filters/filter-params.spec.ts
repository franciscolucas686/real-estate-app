import { describe, expect, it } from 'vitest';
import { BusinessType, PropertyStatus, PropertyType, SaleType } from '@/shared/api/types';
import { parseFilters, serializeFilters, hasAnyFilter } from './filter-params';
import {
  DEFAULT_FILTERS,
  adminFiltersToApiParams,
  countActiveFilters,
  publicFiltersToApiParams,
  type PropertyFilters,
} from './filter-types';

function filters(overrides: Partial<PropertyFilters> = {}): PropertyFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

const parse = (qs: string) => parseFilters(new URLSearchParams(qs));
const serialize = (f: PropertyFilters) => serializeFilters(f).toString();

describe('parseFilters', () => {
  it('lê um link compartilhado completo', () => {
    const result = parse(
      'businessType=SALE&types=HOUSE,APARTMENT&city=Sorocaba&minBedrooms=3&maxPrice=800000&sort=oldest',
    );

    expect(result).toMatchObject({
      businessType: BusinessType.SALE,
      types: [PropertyType.HOUSE, PropertyType.APARTMENT],
      city: 'Sorocaba',
      minBedrooms: 3,
      maxPrice: '800000',
      sort: 'oldest',
    });
  });

  it('cai nos defaults quando a URL está vazia', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it('ignora valores inválidos em vez de quebrar a página', () => {
    // Um link editado à mão não pode derrubar a busca nem gerar um request que a API
    // rejeitaria com 400 (o backend usa forbidNonWhitelisted).
    const result = parse(
      'minBedrooms=abc&businessType=BANANA&sort=random&maxPrice=-5&state=SPXX&code=57a5',
    );

    expect(result.minBedrooms).toBeUndefined();
    expect(result.businessType).toBeUndefined();
    expect(result.sort).toBe('newest');
    expect(result.maxPrice).toBe('');
    expect(result.state).toBe('');
    // Ignorado, não limpo para `575`: o campo aceita só dígitos, e transformar o valor
    // fabricaria uma busca que ninguém pediu.
    expect(result.code).toBe('');
  });

  it('aceita um código todo numérico — o regex não pode ser zeloso demais', () => {
    // Zeros à esquerda são códigos reais e precisam sobreviver.
    expect(parse('code=575301').code).toBe('575301');
    expect(parse('code=0001').code).toBe('0001');
  });

  it('descarta apenas os itens desconhecidos de uma lista', () => {
    expect(parse('types=HOUSE,DRAGON,LAND').types).toEqual([PropertyType.HOUSE, PropertyType.LAND]);
  });

  it('não aceita status pela URL — é o vazamento de inventário fechado no backend', () => {
    const result = parse('status=PENDING&city=Sorocaba');

    expect(result).not.toHaveProperty('status');
    expect(publicFiltersToApiParams(result).status).toBe(PropertyStatus.ACTIVE);
  });
});

describe('serializeFilters', () => {
  it('omite tudo que está no default, para o link ficar legível', () => {
    expect(serialize(filters())).toBe('');
    expect(serialize(filters({ sort: 'newest' }))).toBe('');
  });

  it('inclui só o que o usuário mexeu', () => {
    const qs = serialize(filters({ city: 'Sorocaba', minBedrooms: 3 }));
    expect(qs).toContain('city=Sorocaba');
    expect(qs).toContain('minBedrooms=3');
    expect(qs).not.toContain('sort=');
    expect(qs).not.toContain('code=');
  });

  it('faz round-trip sem perder informação', () => {
    const original = filters({
      businessType: BusinessType.RENT,
      types: [PropertyType.APARTMENT, PropertyType.HOUSE],
      saleTypes: [SaleType.FINANCING],
      neighborhood: 'Campolim',
      minPrice: '250000',
      maxTotalArea: 400,
      sort: 'oldest',
    });

    expect(parseFilters(serializeFilters(original))).toEqual(original);
  });
});

describe('hasAnyFilter', () => {
  it('distingue catálogo vazio de recorte vazio', () => {
    expect(hasAnyFilter(filters())).toBe(false);
    expect(hasAnyFilter(filters({ city: 'Ibiúna' }))).toBe(true);
  });
});

describe('countActiveFilters', () => {
  it('não conta ordenação como filtro', () => {
    expect(countActiveFilters(filters({ sort: 'oldest' }))).toBe(0);
  });

  it('conta um par min/max uma única vez', () => {
    expect(countActiveFilters(filters({ minPrice: '100000' }))).toBe(1);
    expect(countActiveFilters(filters({ minPrice: '100000', maxPrice: '500000' }))).toBe(1);
  });

  it('conta os campos que a versão anterior esquecia', () => {
    // maxBedrooms, maxBathrooms, maxParkingSpaces, minBuiltArea e maxBuiltArea eram
    // ignorados pela lista manual de ifs, então o badge sub-reportava.
    expect(countActiveFilters(filters({ maxBedrooms: 4 }))).toBe(1);
    expect(countActiveFilters(filters({ maxBathrooms: 2 }))).toBe(1);
    expect(countActiveFilters(filters({ maxParkingSpaces: 3 }))).toBe(1);
    expect(countActiveFilters(filters({ minBuiltArea: 80 }))).toBe(1);
    expect(countActiveFilters(filters({ maxBuiltArea: 200 }))).toBe(1);
  });

  it('soma filtros independentes', () => {
    const result = countActiveFilters(
      filters({
        businessType: BusinessType.SALE,
        types: [PropertyType.HOUSE],
        city: 'Sorocaba',
        minPrice: '200000',
        maxPrice: '600000',
        minBedrooms: 2,
      }),
    );
    // negócio + tipo + cidade + faixa de preço + quartos = 5
    expect(result).toBe(5);
  });
});

describe('mapeamento para a API', () => {
  it('a vitrine fixa status ACTIVE', () => {
    expect(publicFiltersToApiParams(filters()).status).toBe(PropertyStatus.ACTIVE);
  });

  it('o admin sem status pedido não envia status — o backend devolve todos', () => {
    expect(adminFiltersToApiParams(filters(), 12)).not.toHaveProperty('status');
  });

  it('o admin com status pedido envia aquele status', () => {
    expect(adminFiltersToApiParams(filters(), 12, PropertyStatus.PENDING).status).toBe(
      PropertyStatus.PENDING,
    );
  });

  it('não envia campos vazios, que virariam 400 no backend', () => {
    const params = publicFiltersToApiParams(filters());
    expect(params).not.toHaveProperty('code');
    expect(params).not.toHaveProperty('city');
    expect(params).not.toHaveProperty('minPrice');
    expect(params).not.toHaveProperty('types');
  });
});
