import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/render';
import { makePropertyCard, setMockProperties } from '@/mocks/handlers';
import { server } from '@/mocks/server';
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

  it('a busca por código recusa o que não é dígito', async () => {
    const user = userEvent.setup();
    let requestedCode: string | null = null;

    server.use(
      http.get('/api/properties', ({ request }) => {
        requestedCode = new URL(request.url).searchParams.get('code');
        return HttpResponse.json({ data: [], total: 0, skip: 0, take: 12 });
      }),
    );

    render();
    const input = screen.getByRole('searchbox', { name: 'Buscar por código' });
    await user.type(input, '57a5-301');

    expect(input).toHaveValue('575301');
    // Depois dos 300ms de `useFilterTextInput`, é isso e nada mais que chega à URL e à API.
    await waitFor(() => expect(requestedCode).toBe('575301'));
  });

  it('ignora um ?code= não numérico em vez de exibi-lo no campo', async () => {
    render('/imoveis?code=57a5');

    // O valor da URL é adotado durante o render, então sem o saneamento no
    // `filter-params.ts` o campo mostraria algo que ele próprio não aceita digitar.
    expect(await screen.findByRole('searchbox', { name: 'Buscar por código' })).toHaveValue('');
    expect(screen.queryByRole('button', { name: /Remover filtro Cód/ })).not.toBeInTheDocument();
  });

  it('a paginação é alcançável em qualquer largura', async () => {
    const user = userEvent.setup();
    render();

    const pager = await screen.findByRole('navigation', { name: 'Paginação' });
    await user.click(within(pager).getByRole('button', { name: '2' }));

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(4));
  });

  it('trocar um filtro volta para a primeira página', async () => {
    const user = userEvent.setup();
    render('/imoveis?page=2');

    // A segunda página dos 16 do seed tem 4 cards.
    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(4));

    // Estreitar o resultado com `page=2` na URL pedia `skip=12` sobre um conjunto de 2, e a
    // API devolvia lista vazia. Como `totalPages` virava 1, o `Pagination` sumia junto — não
    // sobrava controle para voltar à primeira página.
    //
    // Isto afirma o resultado visível, não o mecanismo: as duas defesas (o `page` cair no
    // write dos filtros e a correção de página fora de alcance) levam a esta mesma tela. Quem
    // fixa o reset em si é `use-filters.spec.tsx`.
    setMockProperties([
      makePropertyCard({ id: 'a', neighborhood: 'Campolim', city: 'Sorocaba' }),
      makePropertyCard({ id: 'b', neighborhood: 'Centro', city: 'Sorocaba' }),
    ]);
    await user.selectOptions(screen.getByRole('combobox'), 'oldest');

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(2));
  });

  it('um page fora de alcance vindo de link é corrigido em vez de mostrar lista vazia', async () => {
    // Um link compartilhado quando a listagem tinha mais páginas, aberto depois que o
    // estoque encolheu. Nenhum filtro mudou, então o reset acima não alcança este caminho.
    setMockProperties(seed(3));
    render('/imoveis?page=9');

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(3));
    expect(screen.getByText(/imóveis encontrados/)).toHaveTextContent('3 imóveis encontrados');
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

  /**
   * O card inteiro é um alvo de clique que leva ao imóvel, e as setas do `Carousel` ficam
   * fora do track — então o clique nelas borbulhava até o `<article>` e navegava em vez de
   * trocar a foto. Elas saíram; deslizar, os dots e as setas do teclado seguem paginando.
   *
   * As fotos precisam ser injetadas: `makePropertyCard` traz `previewImages: []`, o card cai
   * no placeholder "Sem fotos" e não monta carrossel nenhum — sem isto o teste passaria por
   * vácuo, afirmando a ausência de um botão que nunca ia existir.
   */
  it('o card da listagem não tem setas laterais na foto', async () => {
    setMockProperties([
      makePropertyCard({
        id: 'com-fotos',
        previewImages: [
          { id: 'img-1', url: 'https://example.test/1.jpg' },
          { id: 'img-2', url: 'https://example.test/2.jpg' },
        ],
      }),
    ]);
    render();

    // Os dots provam que o carrossel montou com mais de um slide, que é a condição das setas.
    expect(await screen.findByRole('button', { name: 'Go to slide 2' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Próxima imagem' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Imagem anterior' })).toBeNull();
  });

  /**
   * `RangeFilter` é totalmente controlado e dispara `onChange` a cada `pointermove`, então
   * ligá-lo direto no `useFilters` transformava um arrasto em dezenas de escritas na URL —
   * dezenas de query keys, dezenas de requisições — e, porque os handlers de range escrevem
   * duas chaves de uma vez e vão por `setFilters`, dezenas de entradas no histórico.
   *
   * O rascunho é dirigido pelos campos de texto, não pelo slider: o slider resolve posição
   * por `getBoundingClientRect`, que é 0 no jsdom, então arrastar ali não move valor nenhum.
   */
  describe('range com commit adiado', () => {
    const panel = () =>
      within(document.querySelector('[data-slot="dropdown-panel"]') as HTMLElement);

    /** Os dois campos do `RangeFilter`, na ordem [mínimo, máximo]. */
    const bounds = () => panel().getAllByRole('textbox');

    async function openValor(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole('button', { name: /^Valor/ }));
    }

    it('mexer no range não consulta a API nem escreve na URL', async () => {
      const user = userEvent.setup();
      const listRequests: string[] = [];
      const count = ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        if (url.pathname === '/api/properties') listRequests.push(url.search);
      };

      render();
      await screen.findByRole('navigation', { name: 'Paginação' });

      // Só a partir daqui, para não contar a busca inicial da página.
      server.events.on('request:start', count);
      try {
        await openValor(user);
        await user.clear(bounds()[0]);
        await user.type(bounds()[0], '300000');

        // Seis teclas, e antes disso seriam seis requisições e seis entradas de histórico.
        expect(listRequests).toEqual([]);
        expect(screen.queryByRole('button', { name: /Remover filtro/ })).not.toBeInTheDocument();
      } finally {
        server.events.removeListener('request:start', count);
      }
    });

    it('"Aplicar filtro" comita uma vez e fecha o painel', async () => {
      const user = userEvent.setup();
      render();
      await screen.findByRole('navigation', { name: 'Paginação' });

      await openValor(user);
      await user.clear(bounds()[0]);
      await user.type(bounds()[0], '300000');
      await user.click(panel().getByRole('button', { name: 'Aplicar filtro' }));

      // Os dois limites viajam juntos, então o chip é o intervalo — não "A partir de".
      expect(
        await screen.findByRole('button', { name: /Remover filtro R\$\s?300\.000/ }),
      ).toBeInTheDocument();
      expect(document.querySelector('[data-slot="dropdown-panel"]')).toBeNull();
    });

    /**
     * O rascunho morre porque o `Dropdown` desmonta o painel ao fechar. Se alguém o mantiver
     * montado — para animar a saída, por exemplo — o valor abandonado reaparece na próxima
     * abertura e nada mais quebra: o filtro aplicado segue certo, só a tela mente.
     */
    it('fechar sem aplicar descarta o rascunho', async () => {
      const user = userEvent.setup();
      render();
      await screen.findByRole('navigation', { name: 'Paginação' });

      await openValor(user);
      await user.clear(bounds()[0]);
      await user.type(bounds()[0], '300000');
      await user.click(document.body); // clique fora fecha o dropdown
      await waitFor(() =>
        expect(document.querySelector('[data-slot="dropdown-panel"]')).toBeNull(),
      );

      await openValor(user);
      expect(bounds()[0]).toHaveValue('0');
    });
  });

  it('a toolbar tem um raio só — os três controles não podem divergir', () => {
    render();

    // Os três combinavam por acidente: `Button` nunca repassava `shape`, então o
    // `shape="pill"` do "Mais filtros" era inerte e ele caía no default `rounded-xl`,
    // que por coincidência é o do `Select`. Ligar o `shape` — uma correção de uma linha
    // e obviamente certa — quebrava a linha sem nada acusar. Agora é `control` explícito
    // dos dois lados, e é isto que segura.
    expect(screen.getByRole('button', { name: /Mais filtros/ })).toHaveClass('rounded-xl');
    expect(screen.getByRole('combobox', { name: 'Ordenar' })).toHaveClass('rounded-xl');
    expect(screen.getByRole('button', { name: 'Tipo' })).toHaveClass('sm:rounded-xl');
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
