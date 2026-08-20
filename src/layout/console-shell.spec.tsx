import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LayoutDashboard, Phone, Search as SearchIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ConsoleShell } from '@/layout/console-shell';
import type { NavItemDescriptor } from '@/layout/app-nav';

/**
 * Both presentations — the sidebar and the bottom bar — render the same entries the
 * storefront does, so signing in no longer replaces the navigation.
 *
 * The console used to keep its own `CONSOLE_NAV` (Imóveis → `/dashboard`, Configurações, Ver
 * o site), which meant every label, icon and destination changed at the door. What survives
 * of it is one rule: `/dashboard` stays lit across the property wizard and the gallery,
 * paths that share no prefix with it, so the operator isn't left with nothing highlighted
 * three screens into creating a listing. That is the sidebar's alone; the bottom bar uses
 * `BottomNavItem`'s plain prefix match.
 *
 * Both are in the DOM at once and only CSS picks one, so every label appears twice. Queries
 * here have to be scoped to one presentation or they are ambiguous.
 */

/** What `useSiteNavItems()` returns for a signed-in visitor. */
const AUTHED_ITEMS: NavItemDescriptor[] = [
  {
    key: 'explorar',
    icon: <SearchIcon size={24} aria-hidden="true" />,
    label: 'Imóveis',
    to: '/imoveis',
  },
  {
    key: 'contato',
    icon: <Phone size={24} aria-hidden="true" />,
    label: 'Contato',
    to: '/contact',
  },
  {
    key: 'dashboard',
    icon: <LayoutDashboard size={24} aria-hidden="true" />,
    label: 'Dashboard',
    to: '/dashboard',
  },
];

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <ConsoleShell items={AUTHED_ITEMS}>
        <p>conteúdo</p>
      </ConsoleShell>
    </MemoryRouter>,
  );
}

const sidebar = () => within(screen.getByRole('complementary', { name: 'Seções do painel' }));
const bottomBar = () => within(document.querySelector('[data-slot="bottom-nav"]') as HTMLElement);

const isCurrent = (scope: ReturnType<typeof sidebar>, label: string) =>
  scope.getByRole('link', { name: label }).getAttribute('aria-current') === 'page';

describe('ConsoleShell', () => {
  describe('sidebar', () => {
    /**
     * A regressão que este trabalho existe para impedir, no desktop: a sidebar mostrava
     * outro conjunto, então entrar no console trocava os três itens de uma vez.
     */
    it('mostra os mesmos itens do storefront, não as seções do painel', () => {
      renderAt('/dashboard');

      expect(sidebar().getByRole('link', { name: 'Imóveis' })).toHaveAttribute('href', '/imoveis');
      expect(sidebar().getByRole('link', { name: 'Contato' })).toBeInTheDocument();
      expect(sidebar().getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();

      // Configurações segue alcançável pela engrenagem no header do dashboard, que renderiza
      // em toda largura; "Ver o site" ficou redundante — os dois primeiros itens são o site.
      expect(sidebar().queryByRole('link', { name: 'Configurações' })).toBeNull();
      expect(sidebar().queryByRole('link', { name: 'Ver o site' })).toBeNull();
    });

    it('marca "Dashboard" na própria rota, e não o "Imóveis" do storefront', () => {
      renderAt('/dashboard');

      expect(isCurrent(sidebar(), 'Dashboard')).toBe(true);
      expect(isCurrent(sidebar(), 'Imóveis')).toBe(false);
    });

    // Ambas as rotas declaram `hideMobileNav`, então na aplicação real só a sidebar renderiza
    // nelas. O que se afirma aqui é a política de `owns` em si — por isso o shell é montado
    // direto, com o `showMobileNav` padrão, e as duas apresentações aparecem.
    it('mantém "Dashboard" aceso no wizard e na galeria, que não compartilham prefixo', () => {
      // `unmount` entre as duas: o cleanup do RTL só roda entre testes, e duas árvores
      // montadas ao mesmo tempo tornam `getByRole` ambíguo de novo.
      const wizard = renderAt('/properties/new');
      expect(isCurrent(sidebar(), 'Dashboard')).toBe(true);
      wizard.unmount();

      renderAt('/properties/abc-123/gallery');
      expect(isCurrent(sidebar(), 'Dashboard')).toBe(true);
    });

    it('a marca leva para a home, como a da topbar', () => {
      renderAt('/dashboard');

      expect(sidebar().getByRole('link', { name: /Francine Gestora/ })).toHaveAttribute(
        'href',
        '/',
      );
    });
  });

  describe('barra inferior', () => {
    it('vem do componente compartilhado, não de uma cópia local', () => {
      renderAt('/dashboard');

      // `data-slot` só existe em `app-nav.tsx` — a cópia inline não o tinha. É a prova de que
      // a barra vem de lá, e não de uma segunda cópia que alguém reintroduziu.
      const bar = document.querySelector('[data-slot="bottom-nav"]');
      expect(bar).not.toBeNull();
      expect(bar).toHaveAttribute('aria-label', 'Navegação principal');
    });

    /**
     * A regressão que este trabalho existe para impedir. A barra renderizava `CONSOLE_NAV`,
     * então entrar no console trocava os três itens de uma vez — outros rótulos, outros
     * ícones, e um "Imóveis" apontando para outro lugar.
     */
    it('mostra os itens do storefront, não as seções do painel', () => {
      renderAt('/dashboard');

      expect(bottomBar().getByRole('link', { name: 'Imóveis' })).toHaveAttribute(
        'href',
        '/imoveis',
      );
      expect(bottomBar().getByRole('link', { name: 'Contato' })).toBeInTheDocument();
      expect(bottomBar().getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();

      expect(bottomBar().queryByRole('link', { name: 'Configurações' })).toBeNull();
      expect(bottomBar().queryByRole('link', { name: 'Ver o site' })).toBeNull();
    });

    it('acende o item da rota atual pelo prefix match padrão', () => {
      renderAt('/dashboard');

      expect(isCurrent(bottomBar(), 'Dashboard')).toBe(true);
      expect(isCurrent(bottomBar(), 'Imóveis')).toBe(false);
    });
  });
});
