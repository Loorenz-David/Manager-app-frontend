import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { selectIsAuthenticated, useAuthStore } from '@/store/auth.store';

export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate replace to={ROUTES.signIn} />;
}
