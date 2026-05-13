import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../../hooks/use-auth';
import { PropertyDetailSkeleton } from './skeletons';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useMe();

  if (isLoading) return <PropertyDetailSkeleton />;
  if (isError || !user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
