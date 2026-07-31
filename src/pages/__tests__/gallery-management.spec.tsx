import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('fora do modo seleção a foto não é um controle', async () => {
    renderWithPhotos();

    await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0));
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('em modo seleção cada foto é um checkbox nomeado e alcançável por teclado', async () => {
    const user = userEvent.setup();
    renderWithPhotos();

    await user.click(await screen.findByRole('button', { name: /Selecionar/i }));

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

    await user.click(await screen.findByRole('button', { name: /Selecionar/i }));
    const boxes = await screen.findAllByRole('checkbox');

    // Sem seleção as ações ficam desabilitadas, o que já era o comportamento — o que
    // mudou é que agora dá para chegar até elas sem um ponteiro.
    const excluir = screen.getByRole('button', { name: /Excluir \(0\)/ });
    expect(excluir).toBeDisabled();

    await user.click(boxes[0]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Excluir \(1\)/ })).toBeEnabled(),
    );
  });
});
