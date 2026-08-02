import { screen, waitFor, within } from '@testing-library/react';
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

  /**
   * As duas barras fixas são afordâncias de telefone: no desktop a trilha (`hidden md:flex`)
   * dá o caminho de volta e o rail lateral (`md:sticky`) mantém o CTA do WhatsApp sempre à
   * vista, então elas seriam duplicatas sobrepostas ao conteúdo.
   *
   * O jsdom não avalia media query, então isto fixa a *regra* — a classe que expressa o
   * corte — e não o resultado renderizado. Mesmo limite assumido em `layout/site-shell.spec.tsx`.
   * O que o teste garante é que remover o `md:hidden` quebra a suíte em vez de devolver as
   * barras ao desktop em silêncio.
   */
  it('as barras fixas são mobile-only', async () => {
    // O rail e o header medem 0 no jsdom. Dar altura ao header é o que satisfaz a condição
    // `ctaBottom < headerH` do CTA fixo — sem isso ele nunca monta e não há o que afirmar.
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return { ...rect.call(this), bottom: 0, height: 50 } as DOMRect;
    };

    try {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      // Dois scrolls, e o segundo só depois do primeiro ter montado o header: a condição
      // do CTA lê `stickyHeaderRef`, que ainda é null enquanto o header não renderizou.
      // Disparar os dois em sequência síncrona mede um ref vazio e o CTA nunca aparece.
      Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });

      window.dispatchEvent(new Event('scroll'));
      await waitFor(() =>
        expect(document.querySelector('[data-slot="sticky-header"]')).not.toBeNull(),
      );

      window.dispatchEvent(new Event('scroll'));
      await waitFor(() =>
        expect(document.querySelector('[data-slot="sticky-cta"]')).not.toBeNull(),
      );

      expect(document.querySelector('[data-slot="sticky-header"]')).toHaveClass('md:hidden');
      expect(document.querySelector('[data-slot="sticky-cta"]')).toHaveClass('md:hidden');
    } finally {
      Element.prototype.getBoundingClientRect = rect;
    }
  });
});
