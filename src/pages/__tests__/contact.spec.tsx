import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Contact } from '@/pages/contact';
import { renderWithProviders } from '@/test/render';
import { server } from '@/mocks/server';

/**
 * A página de contato é a única leitora pública do bloco de configurações, e cada card é
 * condicional ao seu campo — um canal não preenchido não deve aparecer. Isso nunca teve
 * cobertura, e é onde a troca de telefone por Instagram se manifesta para o visitante.
 *
 * O que importa aqui e não aparece no schema: o link é **montado**, não guardado. O registro
 * traz `francinegestora` e o `href` tem de sair `https://instagram.com/francinegestora`.
 */
function mockSettings(overrides: Record<string, string>) {
  server.use(
    http.get('/api/site-settings', () =>
      HttpResponse.json({
        id: 'settings-1',
        whatsapp: '11999990000',
        email: 'contato@imobiliaria.com',
        instagram: 'francinegestora',
        hours: 'Seg-Sex: 9h às 18h',
        updatedAt: new Date().toISOString(),
        ...overrides,
      }),
    ),
  );
}

describe('Contact', () => {
  it('monta o link do perfil a partir do handle guardado', async () => {
    mockSettings({});
    renderWithProviders(<Contact />, { route: '/contact' });

    const link = await screen.findByRole('link', { name: /Instagram/ });
    expect(link).toHaveAttribute('href', 'https://instagram.com/francinegestora');
    expect(screen.getByText('@francinegestora')).toBeInTheDocument();
  });

  it('abre o Instagram em nova aba, sem passar o referrer', async () => {
    mockSettings({});
    renderWithProviders(<Contact />, { route: '/contact' });

    const link = await screen.findByRole('link', { name: /Instagram/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('normaliza um valor gravado antes da regra existir', async () => {
    // O backend passou a recusar isso, mas uma linha antiga pode carregar a URL inteira —
    // `buildInstagramUrl` re-normaliza justamente por isso.
    mockSettings({ instagram: 'https://www.instagram.com/francinegestora/' });
    renderWithProviders(<Contact />, { route: '/contact' });

    const link = await screen.findByRole('link', { name: /Instagram/ });
    expect(link).toHaveAttribute('href', 'https://instagram.com/francinegestora');
  });

  it('omite o card quando não há Instagram configurado', async () => {
    mockSettings({ instagram: '' });
    renderWithProviders(<Contact />, { route: '/contact' });

    // Espera a página sair do esqueleto antes de afirmar ausência, ou o teste passaria
    // por ainda estar carregando.
    await screen.findByRole('link', { name: /WhatsApp/ });
    expect(screen.queryByRole('link', { name: /Instagram/ })).not.toBeInTheDocument();
  });

  it('não oferece mais um canal de telefone', async () => {
    mockSettings({});
    renderWithProviders(<Contact />, { route: '/contact' });

    await screen.findByRole('link', { name: /WhatsApp/ });
    expect(screen.queryByText('Telefone')).not.toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.every((a) => !a.getAttribute('href')?.startsWith('tel:'))).toBe(true);
  });
});
