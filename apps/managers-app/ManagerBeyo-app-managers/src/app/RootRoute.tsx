import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { PwaProvider } from '@/features/pwa/components/PwaProvider';
import { SurfaceProvider } from '@/providers/SurfaceProvider';

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <AuthProvider>
        <PwaProvider>
          <Outlet />
        </PwaProvider>
      </AuthProvider>
    </SurfaceProvider>
  );
}
