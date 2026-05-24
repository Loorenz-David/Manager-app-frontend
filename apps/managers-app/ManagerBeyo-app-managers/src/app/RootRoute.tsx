import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { PwaProvider } from '@/features/pwa';
import { SurfaceProvider } from '@/providers/SurfaceProvider';

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <PwaProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </PwaProvider>
    </SurfaceProvider>
  );
}
