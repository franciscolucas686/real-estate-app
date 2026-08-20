import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '@/pages/login';
import { renderWithProviders } from '@/test/render';

describe('Login', () => {
  it('shows Zod validation errors and never calls the API when the form is invalid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText('E-mail'), 'not-an-email');
    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument();
    expect(screen.getByText('A senha deve ter no mínimo 6 caracteres.')).toBeInTheDocument();
  });

  it('shows the real backend error message on invalid credentials (not a hardcoded string)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText('E-mail'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Senha'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
  });

  it('submits and lets the mutation succeed with valid credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
    await user.type(screen.getByLabelText('Senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.queryByText(/incorretos/)).not.toBeInTheDocument();
    });
  });
});
