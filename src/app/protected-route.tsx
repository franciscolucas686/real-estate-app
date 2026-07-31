import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '@/features/auth/use-auth';
import { PageLoading } from '@/ui/page-loading';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useMe();

  // Neutral loader rather than a content skeleton: this guard fronts the dashboard,
  // settings, the property wizard and the gallery, so any specific shape would be
  // wrong for most of them. It previously rendered `PropertyDetailSkeleton`, which
  // flashed a property-detail layout before four screens that look nothing like one.
  if (isLoading) return <PageLoading label="Verificando sua sessão…" />;
  if (isError || !user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
