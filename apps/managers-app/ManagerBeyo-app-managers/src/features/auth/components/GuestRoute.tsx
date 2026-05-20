import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { selectIsAuthenticated, useAuthStore } from '@/store/auth.store';

export function GuestRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate replace to={ROUTES.home} />;
  }

  return <Outlet />;
}
