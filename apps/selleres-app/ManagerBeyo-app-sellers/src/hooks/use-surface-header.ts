import { useContext } from 'react';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}
