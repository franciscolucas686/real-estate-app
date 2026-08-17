import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '@/features/auth/use-auth';
import { PageLoading } from '@/ui/page-loading';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  // Sem `isError`: `getMe` traduz o 401 para `null`, então "não está logado" chega como data e o
  // `!user` abaixo já o cobre. O que sobra em `isError` é falha real de rede ou 5xx — que também
  // deve mandar para o login, pelo mesmo `!user`, já que aí não há usuário nenhum em mãos.
  const { data: user, isLoading } = useMe();

  // Neutral loader rather than a content skeleton: this guard fronts the dashboard,
  // settings, the property wizard and the gallery, so any specific shape would be
  // wrong for most of them. It previously rendered `PropertyDetailSkeleton`, which
  // flashed a property-detail layout before four screens that look nothing like one.
  if (isLoading) return <PageLoading label="Verificando sua sessão…" />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
