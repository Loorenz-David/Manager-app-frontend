import { useContext } from 'react';
import { SurfaceHeaderContext } from '@beyo/ui';

export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}
