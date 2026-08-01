import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyForm } from '@/pages/property-form';
import { renderWithProviders } from '@/test/render';

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

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Selecione ao menos uma modalidade de venda.'),
    ).toBeInTheDocument();
  });
});

describe("PropertyForm — LAND hides fields that don't apply to a lot", () => {
  it('hides Quartos/Banheiros/Suítes/Vagas/Área construída on step 3, keeping Área total visible', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Área total (m²) *')).toBeInTheDocument();
    expect(screen.queryByText('Quartos')).not.toBeInTheDocument();
    expect(screen.queryByText('Banheiros')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Suítes/)).not.toBeInTheDocument();
    expect(screen.queryByText('Vagas')).not.toBeInTheDocument();
    expect(screen.queryByText('Área construída (m²)')).not.toBeInTheDocument();
  });

  it('clears bedrooms/builtArea filled under HOUSE when the type is switched to LAND', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    // Step 1 — HOUSE
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'HOUSE');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 2
    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 3 — fill bedrooms and builtArea for the HOUSE.
    // By label, not by position. These were `findAllByPlaceholderText('0')[0]` and `[5]`,
    // which meant reordering or adding a numeric field silently retargeted the assertion —
    // the single biggest reason this 1300-line file was risky to refactor.
    await user.type(await screen.findByLabelText('Quartos'), '3');
    await user.type(screen.getByLabelText('Área construída (m²)'), '120');
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();

    // Back to step 1 and switch the type to LAND
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');

    // Forward again to step 3
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Área total (m²) *')).toBeInTheDocument();
    expect(screen.queryByText('Quartos')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('3')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('120')).not.toBeInTheDocument();
  });
});

describe('PropertyForm — full happy path (LAND / SALE)', () => {
  it('walks through all 3 steps and creates the property', async () => {
    const user = userEvent.setup();
    renderNewPropertyForm();

    // Step 1
    await user.selectOptions(screen.getByLabelText('Tipo de imóvel *'), 'LAND');
    await user.click(screen.getByRole('button', { name: 'Venda' }));
    await user.click(screen.getByRole('button', { name: 'Venda direta' }));
    await user.type(screen.getByPlaceholderText('Ex: R$ 450.000'), '450000');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 2
    await user.type(await screen.findByPlaceholderText('Ex: Sorocaba'), 'Sorocaba');
    await user.type(screen.getByPlaceholderText('Ex: SP'), 'SP');
    await user.type(screen.getByPlaceholderText('Ex: Centro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // Step 3 (LAND-specific fields) — addressed by label, so the DOM order of the two
    // selects is no longer part of the contract.
    await user.type(await screen.findByLabelText('Área total (m²) *'), '500');
    await user.selectOptions(screen.getByLabelText('Zoneamento *'), 'RESIDENTIAL');
    await user.selectOptions(screen.getByLabelText('Topografia *'), 'FLAT');
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
