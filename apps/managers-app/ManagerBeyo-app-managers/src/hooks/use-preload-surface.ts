import { useEffect, useRef } from 'react';

export function usePreloadSurface(preload: () => Promise<unknown>): void {
  const stablePreload = useRef(preload);
  useEffect(() => {
    void stablePreload.current();
  }, []);
}
