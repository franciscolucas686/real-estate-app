import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ConsoleShell } from '@/layout/console-shell';

/**
 * The console's active-state policy, pinned because it is the thing most at risk from the
 * bottom bar now coming from `app-nav.tsx` instead of being copied into this file.
 *
 * `BottomNavItem` derives "active" from a prefix match, which is right for the storefront
 * and wrong here: `/dashboard` is labelled "Imóveis" and has to stay lit across the
 * property wizard and the gallery — paths sharing no prefix with it — while "Ver o site"
 * must never light up, because the way out is not a place you are. That is what `owns`
 * encodes, and dropping the `active` prop would silently fall back to the prefix match and
 * leave the wizard with nothing highlighted.
 *
 * Both presentations render at once — the sidebar and the bottom bar are in the DOM
 * together and only CSS picks one — so every label appears twice and the assertions have
 * to cover both. `getByRole` would throw on the ambiguity.
 */
function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <ConsoleShell>
        <p>conteúdo</p>
      </ConsoleShell>
    </MemoryRouter>,
  );
}

/** Every rendering of a nav entry — sidebar and bottom bar both. */
function entries(label: string) {
  const found = screen.getAllByRole('link', { name: label });
  expect(found.length).toBeGreaterThan(1);
  return found;
}

const isCurrent = (label: string) =>
  entries(label).map((el) => el.getAttribute('aria-current') === 'page');

describe('ConsoleShell', () => {
  it('marca "Imóveis" na própria rota', () => {
    renderAt('/dashboard');
    expect(isCurrent('Imóveis')).toEqual([true, true]);
    expect(isCurrent('Configurações')).toEqual([false, false]);
  });

  it('mantém "Imóveis" aceso no wizard e na galeria, que não compartilham prefixo', () => {
    renderAt('/properties/new');
    expect(isCurrent('Imóveis')).toEqual([true, true]);

    renderAt('/properties/abc-123/gallery');
    expect(isCurrent('Imóveis')).toEqual([true, true, true, true]);
  });

  it('"Ver o site" nunca é o lugar onde você está', () => {
    renderAt('/dashboard');
    expect(isCurrent('Ver o site')).toEqual([false, false]);

    renderAt('/settings');
    expect(isCurrent('Ver o site')).toEqual([false, false, false, false]);
  });

  it('renderiza a barra inferior a partir do componente compartilhado', () => {
    renderAt('/dashboard');

    // `data-slot` só existe em `app-nav.tsx` — a cópia inline não o tinha. É a prova de que
    // a barra vem de lá, e não de uma segunda cópia que alguém reintroduziu.
    const bar = document.querySelector('[data-slot="bottom-nav"]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('aria-label', 'Seções do painel');
  });
});
