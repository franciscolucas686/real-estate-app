import { describe, expect, it } from 'vitest';
import { APP_ROUTES, NOT_FOUND_ROUTE, resolveRoute } from './routes';

/**
 * The route table is the single source of truth for which chrome a screen renders in and
 * how it scrolls. Three separate places used to have to agree about that: the JSX route
 * tree, the `ROUTES_WITHOUT_BOTTOM_NAV` array, and a hardcoded `matchPath` inside the
 * scroll-restoration effect. These specs pin the resolution, since getting it wrong is
 * silent — a route would render with the wrong shell, not throw.
 */
describe('resolveRoute', () => {
  it('resolve a vitrine para o SiteShell', () => {
    expect(resolveRoute('/').shell).toBe('site');
    expect(resolveRoute('/contact').shell).toBe('site');
  });

  it('resolve as rotas autenticadas para o ConsoleShell', () => {
    expect(resolveRoute('/dashboard').shell).toBe('console');
    expect(resolveRoute('/settings').shell).toBe('console');
    expect(resolveRoute('/properties/new').shell).toBe('console');
    expect(resolveRoute('/properties/abc-123/edit').shell).toBe('console');
    expect(resolveRoute('/properties/abc-123/gallery').shell).toBe('console');
  });

  it('login renderiza na vitrine, com nav — não é mais uma tela sem chrome', () => {
    // Era `shell: 'focused'`. O item "Entrar" da própria nav leva até aqui, então chegar e
    // perder a navegação deixava o visitante sem caminho de volta que não o botão do
    // navegador. `noScroll` continua: é o teclado virtual, não a ausência de chrome.
    expect(resolveRoute('/login').shell).toBe('site');
    expect(resolveRoute('/login').hideMobileNav).toBeUndefined();
    expect(resolveRoute('/login').noScroll).toBe(true);
  });

  it('distingue o detalhe do imóvel das suas sub-rotas', () => {
    // `/properties/:id` casaria com `/properties/x/edit` sem `end: true`, e o detalhe
    // público renderizaria no lugar do formulário.
    expect(resolveRoute('/properties/abc-123').shell).toBe('site');
    expect(resolveRoute('/properties/abc-123').hideMobileNav).toBe(true);
    expect(resolveRoute('/properties/abc-123/edit').shell).toBe('console');
  });

  it('URL desconhecida cai no catch-all em vez de renderizar vazio', () => {
    expect(resolveRoute('/nao-existe')).toBe(NOT_FOUND_ROUTE);
    expect(resolveRoute('/properties/abc/qualquer-coisa')).toBe(NOT_FOUND_ROUTE);
  });

  it('a galeria esconde a barra inferior, como o wizard', () => {
    // A página é dona do rodapé no celular: a barra "Concluir" e a barra de seleção do
    // gerenciador de ambiente são `fixed bottom-0`, e a nav do console — mesmo z-index,
    // renderizada depois de `{children}` — pintava por cima. O botão existia no DOM e não
    // aparecia no telefone.
    expect(resolveRoute('/properties/abc-123/gallery').hideMobileNav).toBe(true);
  });

  it('só a galeria descarta a posição de scroll', () => {
    const resetting = APP_ROUTES.filter((route) => route.resetScroll).map((route) => route.path);
    expect(resetting).toEqual(['/properties/:id/gallery']);
  });

  it('toda rota do console é guardada — nenhuma tela autenticada fica exposta', () => {
    const unguarded = APP_ROUTES.filter((route) => route.shell === 'console' && !route.guarded).map(
      (route) => route.path,
    );

    expect(unguarded).toEqual([]);
  });

  it('nenhuma rota pública é guardada por acidente', () => {
    const guardedPublic = APP_ROUTES.filter(
      (route) => route.shell !== 'console' && route.guarded,
    ).map((route) => route.path);

    expect(guardedPublic).toEqual([]);
  });
});
