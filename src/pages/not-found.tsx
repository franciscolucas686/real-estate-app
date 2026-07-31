import { Link } from 'react-router-dom';
import { PageContainer } from '@/layout/page-container';

/**
 * There was no catch-all route before this, so an unknown URL rendered the app chrome
 * around an empty content area — indistinguishable from a page that failed to load.
 */
export function NotFound() {
  return (
    <PageContainer
      maxWidth="reading"
      withSafeAreaTop
      className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center md:min-h-full"
    >
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold text-foreground">Esta página não existe</h1>
      <p className="max-w-sm text-sm text-foreground-subtle">
        O endereço pode estar incorreto, ou o imóvel que você procura saiu do ar.
      </p>
      <Link
        to="/"
        className="mt-2 flex h-12 items-center justify-center rounded-full bg-action px-6 text-sm font-semibold text-primary-foreground transition-colors md:hover:bg-action-hover"
      >
        Ver imóveis disponíveis
      </Link>
    </PageContainer>
  );
}
