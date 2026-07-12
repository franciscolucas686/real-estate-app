import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../settings';
import { renderWithProviders } from '../../test/render';

describe('Settings', () => {
  it('rejects an invalid contact e-mail and shows the schema message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const emailInput = await screen.findByPlaceholderText('contato@imobiliaria.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Salvar dados de contato' }));

    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument();
  });

  it('saves valid contact data and shows the success state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const emailInput = await screen.findByPlaceholderText('contato@imobiliaria.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'novo@imobiliaria.com');
    await user.click(screen.getByRole('button', { name: 'Salvar dados de contato' }));

    await waitFor(() => {
      expect(screen.getByText('Salvo')).toBeInTheDocument();
    });
  });

  it('rejects a whatsapp number outside the 8-15 digit range when adding a new one', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const section = (await screen.findByText('WhatsApp da página dos imóveis')).closest(
      'section',
    ) as HTMLElement;
    const numberInput = within(section).getByPlaceholderText('(11) 99999-9999');
    await user.type(numberInput, '123');
    await user.click(within(section).getByRole('button', { name: 'Adicionar número' }));

    expect(
      await within(section).findByText('Número deve ter entre 8 e 15 dígitos.'),
    ).toBeInTheDocument();
  });

  it('adds a valid whatsapp number to the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const section = (await screen.findByText('WhatsApp da página dos imóveis')).closest(
      'section',
    ) as HTMLElement;
    const numberInput = within(section).getByPlaceholderText('(11) 99999-9999');
    await user.type(numberInput, '11988887777');
    await user.click(within(section).getByRole('button', { name: 'Adicionar número' }));

    await waitFor(() => {
      expect(within(section).getByText('(11) 98888-7777')).toBeInTheDocument();
    });
  });
});
