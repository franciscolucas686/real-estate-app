import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { setMockProperty } from '@/mocks/handlers';
import { BusinessType, PropertyStatus, PropertyType, SaleType } from '@/shared/api/types';
import type { PropertyDetailDto } from '@/shared/api/types';
import { PropertyDetails } from '@/pages/property-details';

/**
 * The page rendered two full JSX trees switched on `useIsDesktop()`. The failure mode of
 * collapsing them into one composition is duplication — a section accidentally emitted
 * twice — so these specs assert *exactly one* of each landmark, not merely its presence.
 */

const PROPERTY: PropertyDetailDto = {
  id: 'prop-1',
  code: '575301',
  type: PropertyType.HOUSE,
  businessType: BusinessType.SALE,
  status: PropertyStatus.ACTIVE,
  saleTypes: [{ id: 'st-1', type: SaleType.FINANCING }],
  price: '450000.00',
  rentPrice: null,
  condoFee: '520.00',
  city: 'Sorocaba',
  state: 'SP',
  neighborhood: 'Campolim',
  description: 'Casa ampla com quintal e área gourmet.',
  totalArea: 250,
  builtArea: 180,
  bedrooms: 3,
  bathrooms: 2,
  suites: 1,
  parkingSpaces: 2,
  gallery: { rooms: [], unassigned: [] },
  details: null,
  whatsappContact: '11999990000',
  location: null,
  userId: 'user-1',
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z',
};

const render = () =>
  renderWithProviders(<PropertyDetails />, {
    route: '/properties/prop-1',
    path: '/properties/:id',
  });

describe('PropertyDetails', () => {
  beforeEach(() => setMockProperty(PROPERTY));

  it('renderiza uma única árvore — cada seção aparece exatamente uma vez', async () => {
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Casa' })).toBeInTheDocument();

    // O preço aparecia duas vezes no mobile: no bloco do topo e de novo em
    // "Valores e Negócios".
    expect(screen.getAllByText('R$ 450.000')).toHaveLength(1);
    expect(screen.getAllByText(/Condomínio: R\$ 520/)).toHaveLength(1);
    expect(screen.getAllByRole('heading', { name: 'Sobre o imóvel' })).toHaveLength(1);
  });

  it('mostra o código e a localização', async () => {
    render();

    expect(await screen.findByText('Cód. 575301')).toBeInTheDocument();
    expect(screen.getByText(/Campolim, Sorocaba — SP/)).toBeInTheDocument();
  });

  it('o CTA do WhatsApp existe nas duas posições — rail no desktop, fluxo no mobile', async () => {
    render();

    // Ambos estão no DOM; qual aparece é decidido por CSS (`hidden md:block` /
    // `md:hidden`), não por uma bifurcação de árvore em JS.
    const ctas = await screen.findAllByRole('link', { name: /Conversar conosco agora/ });
    expect(ctas).toHaveLength(2);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', expect.stringContaining('wa.me')));
  });

  it('o status só é exposto a quem pode mudá-lo', async () => {
    render();

    // Visitante anônimo: o badge de status seria uma constante (só vê ACTIVE), então
    // não é informação.
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument();
  });

  it('a trilha leva de volta à listagem, não só à home', async () => {
    render();

    const trail = await screen.findByRole('navigation', { name: 'Trilha' });
    expect(within(trail).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(within(trail).getByRole('link', { name: 'Imóveis' })).toHaveAttribute(
      'href',
      '/imoveis',
    );
  });
});
