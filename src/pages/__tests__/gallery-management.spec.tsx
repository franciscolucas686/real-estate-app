import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { GalleryManagement } from '@/pages/gallery-management';
import { renderWithProviders } from '@/test/render';
import { setMockProperty } from '@/mocks/handlers';
import type { PropertyDetailDto } from '@/shared/api/types';

const PROPERTY: PropertyDetailDto = {
  id: 'prop-1',
  code: '0001',
  type: 'LAND',
  businessType: 'SALE',
  status: 'PENDING',
  saleTypes: [{ id: 'st-1', type: 'DIRECT' }],
  price: '100000',
  rentPrice: null,
  condoFee: null,
  city: 'Sorocaba',
  state: 'SP',
  neighborhood: 'Centro',
  description: 'Terreno plano em ótima localização.',
  totalArea: null,
  builtArea: null,
  bedrooms: null,
  bathrooms: null,
  suites: null,
  parkingSpaces: null,
  gallery: { rooms: [], unassigned: [] },
  details: { zoning: 'RESIDENTIAL', topography: 'FLAT' },
  whatsappContact: null,
  location: null,
  userId: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderGallery() {
  setMockProperty(PROPERTY);
  return renderWithProviders(<GalleryManagement />, {
    route: '/properties/prop-1/gallery',
    path: '/properties/:id/gallery',
  });
}

describe('GalleryManagement — room name validation (galleryRoomSchema)', () => {
  it('rejects adding a room with an empty name', async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(await screen.findByRole('button', { name: 'Adicionar ambiente' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar novo ambiente' }));

    expect(await screen.findByText('Informe o nome do ambiente.')).toBeInTheDocument();
  });

  it('adds a room with a valid name', async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(await screen.findByRole('button', { name: 'Adicionar ambiente' }));
    await user.type(screen.getByPlaceholderText('Nome do ambiente'), 'Sala de estar');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Sala de estar')).toBeInTheDocument();
    });
  });
});

/**
 * Photo selection had no accessible control at all: the photos were plain `<div>`s and
 * selection lived entirely in pointer events on the container. So there was no keyboard
 * path (WCAG 2.1.1), and nothing told assistive tech that a photo could be selected or
 * that it was.
 *
 * Selection now lives only inside the room manager, so every assertion below reaches it the
 * way a user does: through a section's "Gerenciar fotos" tile.
 */
describe('GalleryManagement — seleção de fotos acessível', () => {
  const WITH_PHOTOS: PropertyDetailDto = {
    ...PROPERTY,
    status: 'ACTIVE',
    gallery: {
      rooms: [],
      unassigned: [
        { id: 'img-1', url: 'https://example.test/1.jpg', label: 'Frente', order: 0 },
        { id: 'img-2', url: 'https://example.test/2.jpg', label: null, order: 1 },
      ],
    },
  };

  function renderWithPhotos() {
    setMockProperty(WITH_PHOTOS);
    return renderWithProviders(<GalleryManagement />, {
      route: '/properties/prop-1/gallery',
      path: '/properties/:id/gallery',
    });
  }

  /**
   * A seleção agora só existe dentro da tela do ambiente. As seções empilhadas da página não
   * têm botão "Selecionar" e suas fotos nunca são checkboxes, então todo caminho até a seleção
   * passa por "Gerenciar fotos" antes.
   *
   * O escopo devolvido importa: a página atrás continua *montada* enquanto o gerenciador está
   * aberto (desmontá-la perderia a posição de rolagem), e o `inert` dela não é implementado
   * pelo jsdom nem consultado pelo cálculo de acessibilidade do testing-library — uma consulta
   * sem escopo enxerga as duas árvores.
   */
  async function openRoomManager(user: UserEvent) {
    await user.click(await screen.findByRole('button', { name: 'Gerenciar fotos — Sem ambiente' }));
    return within(await screen.findByRole('dialog'));
  }

  it('a galeria principal não oferece seleção', async () => {
    renderWithPhotos();

    await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
    // Selecionar, excluir e mover pertencem ao ambiente, não à página: uma seleção global com
    // ações por ambiente deixava "Excluir (3)" agir sobre fotos de seções diferentes.
    expect(screen.queryByRole('button', { name: /^Selecionar/ })).not.toBeInTheDocument();
  });

  it('fora do modo seleção a foto não é um controle', async () => {
    const user = userEvent.setup();
    renderWithPhotos();

    await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    // Abrir o gerenciador ainda não é o modo seleção — é a mesma tela por onde se entra vindo
    // de "Adicionar fotos", e ela abre em visualização nos dois casos.
    await openRoomManager(user);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('em modo seleção cada foto é um checkbox nomeado e alcançável por teclado', async () => {
    const user = userEvent.setup();
    renderWithPhotos();

    const room = await openRoomManager(user);
    await user.click(await room.findByRole('button', { name: 'Selecionar fotos' }));

    // Intencionalmente global, não escopado ao gerenciador: o que estas consultas singulares
    // provam é que a página atrás nunca cria um segundo checkbox com o mesmo nome.
    // `RoomSection` não recebe `selecting` — não há por onde isso voltar por descuido.
    const boxes = await screen.findAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    // O rótulo usa a legenda quando existe, e a posição quando não.
    expect(screen.getByRole('checkbox', { name: 'Foto 1 — Frente' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Foto 2' })).toBeInTheDocument();

    boxes.forEach((box) => expect(box).toHaveAttribute('aria-checked', 'false'));

    // Enter/Espaço num <button> — o caminho que simplesmente não existia.
    boxes[0].focus();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Foto 1 — Frente' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    expect(screen.getByRole('checkbox', { name: 'Foto 2' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('a seleção habilita as ações em lote', async () => {
    const user = userEvent.setup();
    renderWithPhotos();

    const room = await openRoomManager(user);
    await user.click(await room.findByRole('button', { name: 'Selecionar fotos' }));
    const boxes = await screen.findAllByRole('checkbox');

    // Sem seleção as ações ficam desabilitadas, o que já era o comportamento — o que
    // mudou é que agora dá para chegar até elas sem um ponteiro. A consulta global também
    // afirma que existe uma `SelectionActionBar` só na árvore: a cópia da página sumiu.
    const excluir = screen.getByRole('button', { name: /Excluir \(0\)/ });
    expect(excluir).toBeDisabled();

    await user.click(boxes[0]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Excluir \(1\)/ })).toBeEnabled(),
    );
  });

  it('adicionar fotos é só do gerenciador, e mostra novas junto das antigas', async () => {
    const user = userEvent.setup();
    renderWithPhotos();

    // A página não tem mais por onde subir foto: as seções empilhadas são um índice, e o
    // upload mora no ambiente, ao lado de selecionar/excluir/mover.
    expect(screen.queryByRole('button', { name: /Adicionar fotos/ })).not.toBeInTheDocument();

    const room = await openRoomManager(user);
    // Pelo botão de verdade, para exercitar `requestUpload` — é ele que aponta o input
    // compartilhado para este ambiente antes de abrir o seletor.
    await user.click(room.getByRole('button', { name: 'Adicionar fotos' }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['x'], 'nova.jpg', { type: 'image/jpeg' }));

    // Novas *e* antigas: o gerenciador é o ambiente inteiro, não só o que acabou de entrar.
    await waitFor(() => expect(room.getByAltText('Foto 3')).toBeInTheDocument());
    expect(room.getByAltText('Frente')).toBeInTheDocument();
    // Sem isto, reescolher o mesmo arquivo não dispararia `change` de novo — o segundo
    // "Adicionar fotos" não adicionaria nada.
    expect(input.value).toBe('');
  });

  it('clicar fora fecha o ambiente em vez de sair da galeria', async () => {
    // O scrim existe pela transição, mas fecha um buraco de verdade: `inert` está na raiz da
    // página e a sidebar do `ConsoleShell` fica fora dela, então sem ele um clique em
    // "Configurações" navegava para outra rota levando embora o rascunho não salvo.
    const user = userEvent.setup();
    renderWithPhotos();

    await openRoomManager(user);
    await user.click(document.querySelector('[data-slot="room-scrim"]')!);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Editar galeria' })).toBeInTheDocument();
  });

  it('o voltar do navegador fecha o ambiente e descarta a seleção', async () => {
    const user = userEvent.setup();
    renderWithPhotos();

    const room = await openRoomManager(user);
    await user.click(await room.findByRole('button', { name: 'Selecionar fotos' }));
    await user.click((await screen.findAllByRole('checkbox'))[0]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Excluir \(1\)/ })).toBeEnabled(),
    );

    // O gesto/botão físico: fecha o ambiente, não a galeria inteira.
    window.history.back();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Editar galeria' })).toBeInTheDocument();

    // A seleção é do ambiente aberto. Levá-la adiante deixaria um "Excluir (N)" agindo sobre
    // fotos que o usuário não vê mais.
    const again = await openRoomManager(user);
    await user.click(await again.findByRole('button', { name: 'Selecionar fotos' }));
    expect(screen.getByRole('button', { name: /Excluir \(0\)/ })).toBeDisabled();
  });
});
