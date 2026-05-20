import { Outlet } from 'react-router-dom';
import { SurfaceProvider } from '@/providers/SurfaceProvider';

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <Outlet />
    </SurfaceProvider>
  );
}
