import { Navigate } from 'react-router-dom';
import { useMe } from '../hooks/use-auth';
import { PropertyDetailSkeleton } from '../components/ui/skeletons';

export function Profile() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <PropertyDetailSkeleton />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
