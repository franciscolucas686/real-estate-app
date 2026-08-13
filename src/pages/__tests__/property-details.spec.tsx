import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

const render = (state?: unknown) =>
  renderWithProviders(<PropertyDetails />, {
    route: '/properties/prop-1',
    path: '/properties/:id',
    state,
  });

/** Sete fotos: passa de cinco, que é o que faz o ladrilho "+N fotos" da tira existir. */
const WITH_PHOTOS: PropertyDetailDto = {
  ...PROPERTY,
  gallery: {
    rooms: [
      {
        id: 'room-1',
        name: 'Sala',
        order: 0,
        images: Array.from({ length: 7 }, (_, i) => ({
          id: `img-${i}`,
          url: `https://example.test/${i}.jpg`,
          label: null,
          order: i,
        })),
      },
    ],
    unassigned: [],
  },
};

const viewer = () => document.querySelector('[data-slot="property-media-viewer"]');
const mosaic = () => screen.queryByText(/^Fotos \(/);

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

  /**
   * `md:top-6` mede a partir do viewport, dentro da faixa que a `TopNav` ocuparia se
   * fixasse. Só é correto porque ela não fixa em rota nenhuma — a outra ponta dessa mesma
   * decisão está em `layout/site-shell.spec.tsx`. Fixar a nav de novo sem subir este offset
   * põe o rail atrás da barra a cada rolagem, badges e título incluídos, que é o bug que
   * ele já teve.
   *
   * O jsdom não calcula layout nem avalia media query, então o que dá para afirmar é a
   * regra, não o resultado renderizado.
   */
  it('o rail crava perto do topo, já que a nav não ocupa a faixa', async () => {
    render();
    await screen.findByRole('heading', { level: 1, name: 'Casa' });

    expect(screen.getByRole('complementary')).toHaveClass('md:top-6');
  });

  /**
   * De `md` para cima toda porta de foto leva ao viewer, e o mosaico passa a ser exclusivo do
   * mobile. Como o destino difere por viewport e esta app não faz checagem de viewport em JS,
   * a foto principal carrega duas superfícies de clique e é o CSS que escolhe qual existe.
   *
   * Daí a necessidade do último teste do bloco: o jsdom não avalia media query, então vê as
   * duas superfícies ao mesmo tempo. Sem fixar as classes que as separam, os dois testes
   * acima passariam mesmo que ambas coexistissem em todas as larguras — que é exatamente a
   * regressão a evitar.
   */
  describe('portas das fotos', () => {
    // A página segura o skeleton enquanto `allImages.length > 0 && !coverReady`, e
    // `coverReady` só cai no `onload`/`onerror` de um `new Image()`. O jsdom não carrega
    // imagem nenhuma, então nenhum dos dois dispara e a página nunca sai do carregando — é
    // por isso que o `PROPERTY` do arquivo tem galeria vazia. Resolver na atribuição do
    // `src`, de forma síncrona: cai dentro do próprio efeito, sem `act()` pendurado.
    const RealImage = window.Image;

    beforeEach(() => {
      setMockProperty(WITH_PHOTOS);
      window.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_url: string) {
          this.onload?.();
        }
      } as unknown as typeof Image;
    });

    afterEach(() => {
      window.Image = RealImage;
    });

    it('a foto principal abre o viewer, não o mosaico', async () => {
      const user = userEvent.setup();
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      await user.click(screen.getByRole('button', { name: 'Ampliar foto 1' }));

      await waitFor(() => expect(viewer()).not.toBeNull());
      expect(mosaic()).toBeNull();
    });

    it('o ladrilho "+N fotos" abre o viewer na foto que ele mostra', async () => {
      const user = userEvent.setup();
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      await user.click(screen.getByRole('button', { name: 'Ver todas as 7 fotos' }));

      // A 6ª foto — `allImages[5]`, a que o próprio ladrilho exibe. Mesma regra das cinco
      // miniaturas antes dele: a foto clicada é a foto que abre.
      await waitFor(() => expect(viewer()).not.toBeNull());
      expect(within(viewer() as HTMLElement).getByText('6/7')).toBeInTheDocument();
      expect(mosaic()).toBeNull();
    });

    it('no mobile a foto principal continua abrindo o mosaico', async () => {
      const user = userEvent.setup();
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      await user.click(document.querySelector('[data-slot="media-open-gallery"]') as HTMLElement);

      await waitFor(() => expect(mosaic()).not.toBeNull());
      expect(viewer()).toBeNull();
    });

    it('as duas superfícies da foto principal são exclusivas por breakpoint', async () => {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      expect(document.querySelector('[data-slot="media-open-gallery"]')).toHaveClass('md:hidden');
      expect(document.querySelector('[data-slot="media-open-viewer"]')).toHaveClass(
        'hidden',
        'md:block',
      );
      // A pílula é a porta do mosaico, e some onde a tira de miniaturas nasce — em `lg`,
      // não em `md`. As duas fronteiras andam juntas: entre md e lg não há dots
      // (`showDots={false}`), não há tira, e as setas só aparecem no hover, então tirar a
      // pílula ali deixaria um tablet tátil sem nenhum sinal de que há mais fotos.
      expect(screen.getByRole('button', { name: 'Ver todas (7)' })).toHaveClass('lg:hidden');
    });

    it('arrastar a foto principal não abre nada', async () => {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      const surface = screen.getByRole('button', { name: 'Ampliar foto 1' });

      // O jsdom não implementa captura de ponteiro, e `onPointerDown` a chama.
      const capture = Element.prototype.setPointerCapture;
      Element.prototype.setPointerCapture = () => {};

      try {
        // Um arrasto de verdade termina em `click` — mousedown e mouseup caem na mesma
        // imagem. Sem a supressão no `use-carousel-swipe`, cada arrasto abriria o viewer.
        fireEvent.pointerDown(surface, { pointerType: 'mouse', clientX: 200, pointerId: 1 });
        fireEvent.pointerMove(surface, { pointerType: 'mouse', clientX: 120, pointerId: 1 });
        fireEvent.pointerUp(surface, { pointerType: 'mouse', clientX: 120, pointerId: 1 });
        fireEvent.click(surface);

        expect(viewer()).toBeNull();
        expect(mosaic()).toBeNull();
      } finally {
        Element.prototype.setPointerCapture = capture;
      }
    });

    /**
     * A foto principal herdava o `4/3.5` do telefone numa coluna de largura de desktop,
     * o que dava ~800px de altura: ela mesma já estourava a viewport e a tira de
     * miniaturas nascia fora da tela.
     *
     * São três proporções porque o que fica *embaixo* da foto muda duas vezes. O `21/9`
     * existe para caber ao lado da tira, e a tira só existe de `lg` para cima — entre
     * `md` e `lg` ele apenas desperdiçaria a altura livre, deixando uma faixa de 132–241px
     * numa viewport de tablet, daí o `16/9`. O teto é a rede para janelas mais baixas que
     * as medidas. O jsdom não avalia media query nem calcula layout, então o que dá para
     * afirmar é a regra — mesmo limite dos testes acima.
     */
    it('a foto principal muda de proporção em cada faixa, com teto de viewport no desktop', async () => {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      const photo = document.querySelector('[data-slot="carousel-slide"] img');

      expect(photo).toHaveClass(
        'aspect-4/3.5',
        'md:aspect-16/9',
        'lg:aspect-21/9',
        'md:max-h-(--property-photo-max-height)',
        'object-cover',
      );
    });

    /**
     * O botão sobreposto é a saída do telefone; no desktop quem leva de volta é o
     * `DetailBreadcrumb` (`hidden md:flex`), e os dois sobrepostos eram dois caminhos para
     * o mesmo lugar na mesma tela. Junto com o `md:hidden` saíram as classes `md:` de
     * tamanho que ele carregava: estilo de uma largura em que o elemento não renderiza é
     * código morto que afirma o contrário para quem lê depois.
     *
     * O ramo `isPostCreate` desenha "Editar imóvel" neste mesmo canto e continua em todas
     * as larguras — é ação, não navegação de volta, e o breadcrumb não o substitui.
     */
    it('o voltar sobre a foto é mobile-only, sem estilo de desktop pendurado', async () => {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      const back = screen.getByRole('button', { name: 'Voltar' });

      expect(back).toHaveClass('md:hidden');
      expect(back.className).not.toMatch(/md:(size-|top-|hover:)/);
    });

    /**
     * A altura da tira é um dos termos de `--property-photo-max-height` (ver a conta em
     * `index.css`). Com `aspect-square` ela valia o que a largura da coluna dividida por
     * seis desse — 120px a 147px pelas larguras onde ela renderiza — e só poderia entrar
     * naquele cálculo como chute do pior caso. Mudar esta altura sem mexer no token reabre
     * exatamente o corte que a mudança fecha.
     */
    it('as miniaturas têm altura fixa — é dela que o teto da foto depende', async () => {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      const tiles = [
        screen.getByRole('button', { name: 'Ver foto 1' }),
        screen.getByRole('button', { name: 'Ver todas as 7 fotos' }),
      ];

      tiles.forEach((tile) => {
        expect(tile).toHaveClass('h-20');
        expect(tile).not.toHaveClass('aspect-square');
      });
    });

    /**
     * A tira começa em `lg`, não em `md`: entre os dois a coluna de mídia tem 308–563px e
     * seis ladrilhos mais cinco vãos deixam cada um pequeno demais para acertar.
     *
     * Este é o mesmo `lg` de outros dois lugares, e os três só fazem sentido juntos: a
     * proporção da foto (`lg:aspect-21/9`, que existe para caber ao lado desta tira), a
     * pílula "Ver todas" (`lg:hidden`, que cobre a faixa onde a tira não está) e os dois
     * últimos termos de `--property-photo-max-height`, que reservam altura para ela.
     */
    it('a tira de miniaturas só existe de lg para cima', async () => {
      render();
      await screen.findByRole('heading', { level: 1, name: 'Casa' });

      const strip = screen.getByRole('button', { name: 'Ver foto 1' }).parentElement;

      expect(strip).toHaveClass('hidden', 'lg:grid');
      expect(strip).not.toHaveClass('md:grid');
    });
  });

  /**
   * As duas telas do fluxo pós-criação dizem *qual* imóvel é o assunto. Antes nenhuma dizia:
   * a de chegada não trazia nada do imóvel, e a de conclusão só o código, embutido no próprio
   * título. Depois de cadastrar três imóveis seguidos, nenhuma das duas identificava um.
   *
   * O bloco é um só (`SplashIdentity`) justamente para as duas não divergirem, e é isso que
   * estes dois casos fixam — em cada momento do fluxo, não no componente isolado.
   */
  describe('splashes do fluxo pós-criação', () => {
    /**
     * As consultas são escopadas na splash porque "Casa" e o código também aparecem na
     * página atrás dela — no `h1`, na trilha e no rail. Sem o escopo o teste passaria com a
     * splash vazia, afirmando só que a página existe.
     */
    const splash = async () =>
      within(
        (await screen.findByText(/com sucesso!|criado!/)).closest(
          '[data-slot="success-splash"]',
        ) as HTMLElement,
      );

    it('a splash de chegada identifica o imóvel recém-criado', async () => {
      render({ context: 'post-create', showSplash: true });

      // O título e o que fazer em seguida seguem sendo o assunto principal; a identidade
      // entra abaixo, sem disputar com eles.
      const s = await splash();
      expect(s.getByText('Imóvel criado!')).toBeInTheDocument();
      expect(s.getByText('Revise o imóvel e finalize o cadastro.')).toBeInTheDocument();
      expect(s.getByText(/Casa/)).toBeInTheDocument();
      expect(s.getByText(/Sorocaba/)).toBeInTheDocument();
      expect(s.getByText('Cód. 575301')).toBeInTheDocument();
    });

    it('a splash de conclusão identifica o imóvel, e o código sai do título', async () => {
      const user = userEvent.setup();
      // Sem `showSplash`: as duas splashes ficariam montadas ao mesmo tempo e cada texto
      // apareceria em dobro. Aqui só a de conclusão existe.
      render({ context: 'post-create' });

      await user.click(await screen.findByRole('button', { name: 'Finalizar imóvel' }));

      // Uma frase só. O título carregava o código com um `<br />` no meio — uma quebra
      // posicionada para um comprimento de string específico, numa tela de largura variável.
      const s = await splash();
      expect(s.getByText('Imóvel finalizado com sucesso!')).toBeInTheDocument();
      expect(s.getByText('Cód. 575301')).toBeInTheDocument();
      expect(s.getByText(/Casa/)).toBeInTheDocument();
      expect(s.getByText(/Sorocaba/)).toBeInTheDocument();
    });
  });
});
