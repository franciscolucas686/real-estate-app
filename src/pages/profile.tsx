import { Navigate } from 'react-router-dom';
import { useMe } from '@/features/auth/use-auth';
import { PageLoading } from '@/ui/page-loading';

/**
 * Pure redirector — signed-in users go to the dashboard, everyone else to login.
 * Renders a neutral loader while the session resolves; it previously showed
 * `PropertyDetailSkeleton`, flashing a property-detail layout for a route that
 * never renders one.
 */
export function Profile() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <PageLoading label="Verificando sua sessão…" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
