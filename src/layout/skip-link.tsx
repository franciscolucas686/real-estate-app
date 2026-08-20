/**
 * Lets a keyboard user jump past the navigation straight to the page content.
 *
 * WCAG 2.4.1 (Bypass Blocks). Without it, reaching the first result on the listing means
 * tabbing through every nav item on every page — and the app had no `sr-only` content at
 * all, so there was no escape hatch of any kind.
 *
 * Visible only while focused: it is a control for people who tab, and showing it always
 * would cost layout space for everyone else.
 */
export function SkipLink({ targetId = 'conteudo' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-(--z-splash) focus:flex focus:h-11 focus:items-center focus:rounded-full focus:bg-action focus:px-5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
    >
      Ir para o conteúdo
    </a>
  );
}
