import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BusinessType, PropertyType } from '@/shared/api/types';
import { DEFAULT_FILTERS } from './filter-types';
import { useFilters } from './use-filters';

/**
 * What matters here is not that state changes — it's *where* it lives and how it
 * interacts with browser history. Before this hook read from the URL, a filtered search
 * could not be shared, did not survive a reload, and the back button did nothing.
 */
function setup(initialUrl = '/') {
  function wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>;
  }

  return renderHook(
    () => {
      const location = useLocation();
      return { ...useFilters(), search: location.search };
    },
    { wrapper },
  );
}

describe('useFilters', () => {
  it('hidrata a partir da URL — é o que torna um link compartilhável', () => {
    const { result } = setup('/?city=Sorocaba&types=HOUSE&minBedrooms=3');

    expect(result.current.filters.city).toBe('Sorocaba');
    expect(result.current.filters.types).toEqual([PropertyType.HOUSE]);
    expect(result.current.filters.minBedrooms).toBe(3);
  });

  it('updateFilter escreve na URL', () => {
    const { result } = setup();

    act(() => result.current.updateFilter('businessType', BusinessType.RENT));

    expect(result.current.search).toContain('businessType=RENT');
    expect(result.current.filters.businessType).toBe(BusinessType.RENT);
  });

  it('remover um filtro o apaga da URL em vez de gravar vazio', () => {
    const { result } = setup('/?city=Sorocaba');

    act(() => result.current.updateFilter('city', ''));

    expect(result.current.search).not.toContain('city');
  });

  it('resetFilters limpa a query inteira', () => {
    const { result } = setup('/?city=Sorocaba&types=HOUSE&sort=oldest');

    act(() => result.current.resetFilters());

    expect(result.current.search).toBe('');
    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
  });

  it('preserva params que não são filtros, como page', () => {
    // Sem isso, mexer num filtro descartaria a paginação — serializeFilters só devolve
    // chaves de filtro.
    const { result } = setup('/?page=3&city=Sorocaba');

    act(() => result.current.updateFilter('minBedrooms', 2));

    expect(result.current.search).toContain('page=3');
    expect(result.current.search).toContain('minBedrooms=2');
  });

  it('setFilters aplica em lote e o resultado é reversível pelo histórico', () => {
    const { result } = setup('/?city=Sorocaba');

    act(() =>
      result.current.setFilters({
        ...DEFAULT_FILTERS,
        neighborhood: 'Campolim',
        types: [PropertyType.APARTMENT],
      }),
    );

    expect(result.current.search).toContain('neighborhood=Campolim');
    expect(result.current.search).toContain('types=APARTMENT');
    expect(result.current.search).not.toContain('city=Sorocaba');
  });

  it('sobrevive a uma URL inválida sem lançar', () => {
    expect(() => setup('/?minBedrooms=abc&businessType=NOPE&types=DRAGON')).not.toThrow();

    const { result } = setup('/?minBedrooms=abc&businessType=NOPE&types=DRAGON');
    expect(result.current.filters.minBedrooms).toBeUndefined();
    expect(result.current.filters.types).toEqual([]);
  });
});
