import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { server } from '@/mocks/server';
import { makePropertyCard, setMockProperties } from '@/mocks/handlers';
import { PropertyStatus } from '@/shared/api/types';
import { Dashboard } from '@/pages/dashboard';

/**
 * The dashboard had no test coverage at all, which is why `isDesktop ? 12 : 100` survived
 * as long as it did. These specs pin the behaviours that used to differ by viewport —
 * page size, where `code` search is applied, whether pagination is reachable — plus the
 * error path the page never handled.
 */

function seed(count: number, status: PropertyStatus = PropertyStatus.ACTIVE) {
  return Array.from({ length: count }, (_, i) =>
    makePropertyCard({
      id: `prop-${i}`,
      code: String(575301 + i),
      neighborhood: `Bairro ${i}`,
      status,
    }),
  );
}

const render = (route = '/dashboard') =>
  renderWithProviders(<Dashboard />, { route, path: '/dashboard' });

describe('Dashboard', () => {
  beforeEach(() => {
    setMockProperties([
      ...seed(14, PropertyStatus.ACTIVE),
      ...seed(2, PropertyStatus.PENDING).map((p) => ({
        ...p,
        id: `pend-${p.id}`,
        code: `9${p.code}`,
      })),
    ]);
  });

  it('mostra 12 imóveis por página em qualquer viewport', async () => {
    render();

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(12));
  });

  it('a paginação é alcançável — era `hidden md:flex` e no mobile travava em 100 itens', async () => {
    const user = userEvent.setup();
    render();

    const pager = await screen.findByRole('navigation', { name: 'Paginação' });
    await user.click(within(pager).getByRole('button', { name: '2' }));

    // 16 no total, 12 na primeira página, 4 na segunda.
    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(4));
  });

  it('a página fica na URL, então F5 e o botão voltar preservam o lugar', async () => {
    render('/dashboard?page=2');

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(4));
  });

  it('um page fora de alcance é corrigido em vez de mostrar a grade vazia', async () => {
    // Um favorito de "pendentes, página 9" aberto depois que a fila foi resolvida. Nenhum
    // filtro mudou, então o `resetPage` não dispara — e sem a correção sobrava uma grade
    // vazia com o cabeçalho contando 16, sem pager (`Pagination` não renderiza em
    // `totalPages <= 1`) e portanto sem controle para voltar.
    render('/dashboard?page=9');

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(4));
  });

  it('filtrar por status a partir do card de contagem', async () => {
    const user = userEvent.setup();
    render();

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(12));

    await user.click(await screen.findByRole('button', { name: /Pendentes/ }));

    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(2));
  });

  it('a busca por código é aplicada no servidor', async () => {
    const user = userEvent.setup();
    let requestedCode: string | null = null;

    server.use(
      http.get('/api/properties', ({ request }) => {
        requestedCode = new URL(request.url).searchParams.get('code');
        return HttpResponse.json({ data: [], total: 0, skip: 0, take: 12 });
      }),
    );

    render();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar por código' }), '575305');

    // Antes: server-side no desktop e `includes()` no cliente sobre um lote de 100 no
    // mobile — o mesmo controle com semântica diferente por dispositivo.
    await waitFor(() => expect(requestedCode).toBe('575305'));
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

    // Nem na tela nem no request: o campo é um `NumericInput`, então uma letra não tem por
    // onde entrar — e o `?code=` que chega da URL passa por `parseCode`.
    expect(input).toHaveValue('575301');
    await waitFor(() => expect(requestedCode).toBe('575301'));
  });

  it('mostra erro com retry quando a listagem falha — a página ignorava isError', async () => {
    server.use(
      http.get('/api/properties', () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Erro interno', error: 'Internal Server Error' },
          { status: 500 },
        ),
      ),
    );

    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar seus imóveis');
    expect(within(alert).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('distingue catálogo vazio de recorte vazio', async () => {
    setMockProperties([]);
    render();

    expect(await screen.findByText('Nenhum imóvel cadastrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar meu primeiro imóvel' })).toBeInTheDocument();
  });

  it('um recorte vazio por status sozinho não oferece nem limpar nem cadastrar', async () => {
    // Um filtro de status sem resultado está fazendo exatamente o que foi pedido — não há
    // nada "sujo" para limpar, e o catálogo não está vazio, então "Cadastrar" seria enganoso.
    setMockProperties(seed(3, PropertyStatus.ACTIVE));
    render('/dashboard?status=INACTIVE');

    expect(await screen.findByText('Nenhum imóvel inativo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpar filtro' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar meu primeiro imóvel' }),
    ).not.toBeInTheDocument();
  });

  it('uma busca por código sem resultado oferece limpar filtros, não cadastrar', async () => {
    setMockProperties(seed(3, PropertyStatus.ACTIVE));
    render('/dashboard?code=999999');

    expect(await screen.findByText('Nenhum imóvel com esse código')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtro' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Cadastrar meu primeiro imóvel' }),
    ).not.toBeInTheDocument();
  });

  it('as ações de navegação são links de verdade, não botões', async () => {
    render();

    // ctrl+click, clique do meio e "abrir em nova aba" dependem de um <a href>.
    expect(screen.getByRole('link', { name: /Novo imóvel/ })).toHaveAttribute(
      'href',
      '/properties/new',
    );
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.getByRole('link', { name: 'Criar imóvel' })).toHaveAttribute(
      'href',
      '/properties/new',
    );
  });
});
