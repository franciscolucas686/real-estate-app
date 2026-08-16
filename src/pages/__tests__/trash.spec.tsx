import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { makePropertyCard, setMockProperties } from '@/mocks/handlers';
import { Trash } from '@/pages/trash';

/**
 * A lixeira existe porque `useRestoreProperty` e `PATCH /properties/:id/restore` já
 * existiam sem nenhuma tela que os chamasse: um imóvel excluído por engano ficava
 * irrecuperável pelo app durante os 30 dias em que o dado ainda estava lá.
 */
function diasAtras(dias: number) {
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

describe('Trash', () => {
  beforeEach(() => {
    setMockProperties([]);
  });

  it('mostra o estado vazio quando não há nada excluído', async () => {
    renderWithProviders(<Trash />);

    expect(await screen.findByText('A lixeira está vazia.')).toBeInTheDocument();
  });

  it('lista apenas os imóveis excluídos', async () => {
    setMockProperties([
      makePropertyCard({ id: 'vivo', neighborhood: 'Centro', deletedAt: null }),
      makePropertyCard({ id: 'morto', neighborhood: 'Campolim', deletedAt: diasAtras(3) }),
    ]);

    renderWithProviders(<Trash />);

    expect(await screen.findByText(/Campolim/)).toBeInTheDocument();
    expect(screen.queryByText(/Centro/)).not.toBeInTheDocument();
  });

  it('mostra quantos dias restam antes da exclusão definitiva', async () => {
    setMockProperties([makePropertyCard({ id: 'p1', deletedAt: diasAtras(28) })]);

    renderWithProviders(<Trash />);

    // 30 - 28 = 2 dias restantes.
    expect(await screen.findByText('Some em 2 dias')).toBeInTheDocument();
  });

  /**
   * O ramo de erro não existia, e a falha era pior do que parecer nada: sem `data`, o
   * `total` cai para 0 e a tela dizia "A lixeira está vazia" — a mensagem mais
   * tranquilizadora possível exatamente quando o operador procura o que apagou por engano.
   */
  it('uma falha de rede não se disfarça de lixeira vazia', async () => {
    server.use(http.get('/api/properties/trash', () => HttpResponse.error()));

    renderWithProviders(<Trash />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lixeira',
    );
    expect(screen.queryByText('A lixeira está vazia.')).not.toBeInTheDocument();
  });

  it('restaurar tira o imóvel da lixeira', async () => {
    const user = userEvent.setup();
    setMockProperties([
      makePropertyCard({ id: 'p1', neighborhood: 'Campolim', deletedAt: diasAtras(1) }),
    ]);

    renderWithProviders(<Trash />);

    await user.click(await screen.findByRole('button', { name: /Restaurar/ }));

    await waitFor(() => {
      expect(screen.getByText('A lixeira está vazia.')).toBeInTheDocument();
    });
  });
});
