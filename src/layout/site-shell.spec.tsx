import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SiteShell } from '@/layout/site-shell';
import type { NavItemDescriptor } from '@/layout/app-nav';

/**
 * Which nav shows at which width is decided by CSS, and jsdom does not evaluate media
 * queries — so these assert the *rule* (the breakpoint class each bar carries) rather than
 * the rendered outcome. That is the honest limit of what this level can prove: it catches
 * the bar losing its breakpoint or the two stopping being mutually exclusive, which is the
 * regression that would actually happen. It cannot catch Tailwind failing to emit `md:`.
 *
 * Worth pinning because `/login` now renders in this shell (it was `focused`, with no
 * chrome at all), so the storefront's "bottom bar below `md`, top nav from `md` up" rule
 * is what the sign-in screen inherits.
 */
const ITEMS: NavItemDescriptor[] = [
  { key: 'imoveis', icon: <span />, label: 'Imóveis', to: '/imoveis' },
  { key: 'contato', icon: <span />, label: 'Contato', to: '/contact' },
  { key: 'entrar', icon: <span />, label: 'Entrar', to: '/login' },
];

function renderAt(pathname: string, props?: { showMobileNav?: boolean }) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <SiteShell items={ITEMS} {...props}>
        <p>conteúdo</p>
      </SiteShell>
    </MemoryRouter>,
  );
}

const bottomBar = () => document.querySelector('[data-slot="bottom-nav"]');
const topBar = () => document.querySelector('[data-slot="top-nav"]');

describe('SiteShell', () => {
  it('as duas barras são mutuamente exclusivas no mesmo breakpoint', () => {
    renderAt('/login');

    // Abaixo de `md` a barra inferior; de `md` para cima, a superior. Se alguém mexer em
    // um dos dois lados sem o outro, aparecem as duas juntas ou nenhuma.
    expect(bottomBar()).toHaveClass('md:hidden');
    expect(topBar()).toHaveClass('hidden', 'md:flex');
  });

  it('a tela de login recebe a barra inferior, com "Entrar" como item ativo', () => {
    renderAt('/login');

    expect(bottomBar()).not.toBeNull();
    const entrar = screen.getAllByRole('link', { name: 'Entrar' });
    expect(entrar).toHaveLength(2); // barra inferior + nav superior
    entrar.forEach((el) => expect(el).toHaveAttribute('aria-current', 'page'));
  });

  it('hideMobileNav remove só a barra inferior, preservando a superior', () => {
    renderAt('/properties/abc-123', { showMobileNav: false });

    expect(bottomBar()).toBeNull();
    expect(topBar()).not.toBeNull();
  });

  /**
   * A nav rola embora com a página em toda rota — não fixa em nenhuma.
   *
   * Vale afirmar a negativa porque `md:sticky` é a mudança de uma palavra, e o estrago não
   * aparece aqui: quando a nav fixa, ela ocupa a faixa do topo, e todo sticky de página
   * passa a precisar reservar `--site-nav-height` acima de si. `position: sticky` mede a
   * partir do viewport, nunca do fim da nav. O rail do property-details (`md:top-6`) é
   * quem paga — foi exatamente o bug que ele já teve.
   */
  it('a nav não fixa no topo', () => {
    renderAt('/login');

    expect(topBar()).not.toHaveClass('md:sticky');
  });

  /**
   * A altura segue declarada, mesmo sem ninguém precisando escapar dela: derivá-la de
   * `py-10` mais o filho mais alto dá 80px abaixo de `lg` e ~110px fluidos acima, porque o
   * logo entra em `text-lg`. O token é o que torna isso um número, e não um resultado.
   */
  it('a nav declara a própria altura', () => {
    renderAt('/login');

    expect(topBar()).toHaveClass('md:h-(--site-nav-height)');
  });
});
