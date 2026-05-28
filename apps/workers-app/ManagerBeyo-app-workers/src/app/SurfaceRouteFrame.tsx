import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomSheetSurface } from '@/components/surfaces/BottomSheetSurface';
import { ModalSurface } from '@/components/surfaces/ModalSurface';
import { SlidePageSurface } from '@/components/surfaces/SlidePageSurface';
import type { SurfaceType } from '@/providers/SurfaceProvider';

type SurfaceLocationState = {
  surface?: Exclude<SurfaceType, 'page'>;
  background?: { pathname: string; search: string };
};

const SURFACE_SHELLS = {
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
} as const;

export function SurfaceRouteFrame(): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as SurfaceLocationState;

  if (!state.surface || !state.background) {
    return <Outlet />;
  }

  const Shell = SURFACE_SHELLS[state.surface];
  if (!Shell) {
    return <Outlet />;
  }

  return (
    <Shell isTopmost onClose={() => navigate(-1)} zIndex={50}>
      <Outlet />
    </Shell>
  );
}
