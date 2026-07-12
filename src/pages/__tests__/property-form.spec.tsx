import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyForm } from '../property-form';
import { renderWithProviders } from '../../test/render';

function renderNewPropertyForm() {
  return renderWithProviders(<PropertyForm />, { route: '/properties/new' });
}

describe('PropertyForm — step 1 validation blocks navigation', () => {
  it('shows the first Zod error and stays on step 1 when nothing is filled', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Selecione o tipo do imóvel.')).toBeInTheDocument();
    // Still step 1 — the city field (step 2) shouldn't be in the document.
    expect(screen.queryByPlaceholderText('Ex: Sorocaba')).not.toBeInTheDocument();
  });

  it('rejects a SALE property with no sale modality selected', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByRole('combobox'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Selecione ao menos uma modalidade de venda.'),
    ).toBeInTheDocument();
  });
});

describe('PropertyForm — full happy path (LAND / SALE)', () => {
  it('walks through all 3 steps and creates the property', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    // Step 1
    await user.selectOptions(screen.getByRole('combobox'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 2
    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 3 (LAND-specific fields)
    const selects = await screen.findAllByRole('combobox');
    await user.selectOptions(selects[0], 'RESIDENTIAL'); // zoning
    await user.selectOptions(selects[1], 'FLAT'); // topography
    await user.type(
      screen.getByPlaceholderText('Descreva o imóvel...'),
      'Terreno plano em ótima localização, pronto para construir.',
    );
    await user.click(screen.getByRole('button', { name: 'Criar e ir para Galeria' }));

    // On success the component navigates away (no matching route registered
    // in the test), so its own submit button unmounts.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Criar e ir|Salvando/ })).not.toBeInTheDocument();
    });
  });
});
