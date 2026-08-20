import { Loader2 } from 'lucide-react';

/**
 * Neutral, layout-agnostic loading state for a whole route.
 *
 * Use when the thing being awaited says nothing about what will render — the auth
 * check in `ProtectedRoute` is the case: it guards the dashboard, settings, the
 * property wizard and the gallery, which look nothing alike. A content-shaped
 * skeleton is the better choice only when the shape is actually known; using one
 * here (as `PropertyDetailSkeleton` was) promises a property detail page and then
 * renders something else.
 */
export function PageLoading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      data-slot="page-loading"
      role="status"
      aria-busy="true"
      className="flex min-h-dvh items-center justify-center md:min-h-full"
    >
      <Loader2 size={32} className="animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
