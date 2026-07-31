import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { makePropertyCard, setMockProperties } from '@/mocks/handlers';
import { BusinessType, PropertyStatus, PropertyType } from '@/shared/api/types';
import { Properties } from '@/pages/properties';
import { Home } from '@/pages/home';

function seed(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makePropertyCard({
      id: `prop-${i}`,
      code: String(575301 + i),
      neighborhood: `Bairro ${i}`,
      status: PropertyStatus.ACTIVE,
    }),
  );
}

describe('Properties (listagem pública)', () => {
  beforeEach(() => setMockProperties(seed(16)));

  const render = (route = '/imoveis') =>
    renderWithProviders(<Properties />, { route, path: '/imoveis' });

  it('hidrata os filtros a partir da URL — um link filtrado chega filtrado', async () => {
    setMockProperties([
      makePropertyCard({ id: 'a', neighborhood: 'Campolim', city: 'Sorocaba' }),
      makePropertyCard({ id: 'b', neighborhood: 'Centro', city: 'Ibiúna' }),
    ]);

    render('/imoveis?city=Sorocaba');

    // O chip mostra *qual* filtro está agindo, algo que só um contador não dizia.
    expect(await screen.findByRole('button', { name: /Remover filtro Cidade: Sorocaba/ }));
  });

  it('um chip remove só o seu filtro, sem zerar os outros', async () => {
    const user = userEvent.setup();
    render('/imoveis?city=Sorocaba&minBedrooms=3');

    await user.click(
      await screen.findByRole('button', { name: /Remover filtro Cidade: Sorocaba/ }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Cidade: Sorocaba/ })).not.toBeInTheDocument(),
    );
    // O outro filtro sobrevive — antes, "Limpar filtros" era tudo ou nada.
    expect(screen.getByRole('button', { name: /Remover filtro 3\+ quartos/ })).toBeInTheDocument();
  });

  it('a paginação é alcançável em qualquer largura', async () => {
    const user = userEvent.setup();
    render();

    const pager = await screen.findByRole('navigation', { name: 'Paginação' });
    await user.click(within(pager).getByRole('button', { name: '2' }));

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(4));
  });

  it('não afirma "0 encontrados" enquanto carrega, e anuncia a contagem real', async () => {
    render();

    // Durante o carregamento o texto é honesto, não um zero que ainda não é verdade.
    expect(screen.getByText('Buscando imóveis…')).toHaveAttribute('aria-live', 'polite');

    await waitFor(() =>
      expect(screen.getByText(/imóveis encontrados/)).toHaveTextContent('16 imóveis encontrados'),
    );
  });

  it('o modal de filtros é a superfície única e tem multi-seleção de tipo', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Filtros' });

    // Sale modality só aparecia no mobile; tipo era single-select no desktop.
    await user.click(within(dialog).getByRole('button', { name: 'Casa' }));
    await user.click(within(dialog).getByRole('button', { name: 'Apartamento' }));

    expect(within(dialog).getByRole('button', { name: 'Casa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dialog).getByRole('button', { name: 'Apartamento' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('fechar o modal sem aplicar não mexe nos resultados', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: /Mais filtros/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Filtros' });
    await user.click(within(dialog).getByRole('button', { name: 'Casa' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Remover filtro Casa/ })).not.toBeInTheDocument();
  });
});

describe('Home', () => {
  beforeEach(() =>
    setMockProperties([
      makePropertyCard({ id: 'sale', businessType: BusinessType.SALE }),
      makePropertyCard({
        id: 'rent',
        businessType: BusinessType.RENT,
        price: null,
        rentPrice: '2400.00',
      }),
    ]),
  );

  it('abre com proposta e busca, não com uma grade sem contexto', async () => {
    renderWithProviders(<Home />, { route: '/' });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'O imóvel certo em Sorocaba e região',
    );
    expect(screen.getByRole('button', { name: /Buscar/ })).toBeInTheDocument();
  });

  it('os campos do hero são rotulados e compõem a busca', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Home />, { route: '/' });

    // Rótulos associados: o hero é a primeira coisa que um leitor de tela encontra.
    await user.type(screen.getByLabelText('Onde'), 'Sorocaba');
    await user.selectOptions(screen.getByLabelText('Negócio'), BusinessType.SALE);
    await user.selectOptions(screen.getByLabelText('Tipo'), PropertyType.HOUSE);

    expect(screen.getByLabelText('Onde')).toHaveValue('Sorocaba');
    expect(screen.getByLabelText('Negócio')).toHaveValue(BusinessType.SALE);
    expect(screen.getByLabelText('Tipo')).toHaveValue(PropertyType.HOUSE);
    // A composição da URL em si é coberta por filter-params.spec; aqui o que importa é que
    // os três controles existem, são alcançáveis por rótulo e guardam o que foi escolhido.
  });
});
