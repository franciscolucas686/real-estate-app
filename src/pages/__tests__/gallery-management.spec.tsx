import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryManagement } from '../gallery-management';
import { renderWithProviders } from '../../test/render';
import { setMockProperty } from '../../mocks/handlers';
import type { PropertyDetailDto } from '../../types/api';

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
