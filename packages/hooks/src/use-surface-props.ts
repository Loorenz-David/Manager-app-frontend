import { useContext } from 'react';
import { SurfacePropsContext } from '@beyo/ui';

export function useSurfaceProps<T extends Record<string, unknown>>(): Partial<T> {
  return useContext(SurfacePropsContext) as Partial<T>;
}
