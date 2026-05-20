import { useSurfaceStore } from '@/providers/SurfaceProvider';

export function useSurface() {
  const open = useSurfaceStore((state) => state.open);
  const close = useSurfaceStore((state) => state.close);
  const closeTop = useSurfaceStore((state) => state.closeTop);
  const closeAll = useSurfaceStore((state) => state.closeAll);
  const stack = useSurfaceStore((state) => state.stack);

  return {
    open,
    close,
    closeTop,
    closeAll,
    isOpen: (id: string) => stack.some((surface) => surface.id === id),
  };
}
