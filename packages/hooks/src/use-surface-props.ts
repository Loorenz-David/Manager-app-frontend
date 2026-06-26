import { useContext } from 'react';
import { SurfacePropsContext } from '@beyo/ui';

export function useSurfaceProps<T extends object>(): Partial<T> {
  return useContext(SurfacePropsContext) as Partial<T>;
}
