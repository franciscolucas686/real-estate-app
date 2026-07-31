import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SkipLink } from './skip-link';
import { SiteShell } from './site-shell';

/**
 * WCAG 2.4.1 (Bypass Blocks). Before this the app had no `sr-only` content anywhere, so a
 * keyboard user had no way past the navigation — reaching the first search result meant
 * tabbing through every nav item, on every page.
 */
describe('SkipLink', () => {
  it('é o primeiro alvo de tabulação e aponta para o conteúdo', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SiteShell items={[{ key: 'a', icon: null, label: 'Explorar', to: '/' }]}>
          <p>conteúdo da página</p>
        </SiteShell>
      </MemoryRouter>,
    );

    await user.tab();

    const link = screen.getByRole('link', { name: 'Ir para o conteúdo' });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute('href', '#conteudo');
  });

  it('o alvo existe — um skip-link apontando para nada é pior que nenhum', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteShell items={[]}>
          <p>conteúdo da página</p>
        </SiteShell>
      </MemoryRouter>,
    );

    expect(container.querySelector('#conteudo')).not.toBeNull();
  });

  it('fica oculto até receber foco', () => {
    render(
      <MemoryRouter>
        <SkipLink />
      </MemoryRouter>,
    );

    // `sr-only` sem `focus:not-sr-only` seria invisível até para quem tabula.
    const link = screen.getByRole('link', { name: 'Ir para o conteúdo' });
    expect(link).toHaveClass('sr-only');
    expect(link).toHaveClass('focus:not-sr-only');
  });
});
