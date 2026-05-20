import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { SurfaceProvider } from '@/providers/SurfaceProvider';

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </SurfaceProvider>
  );
}
