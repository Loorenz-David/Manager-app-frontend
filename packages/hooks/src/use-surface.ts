import { useSurfaceStore } from '@beyo/ui';

export function useSurface() {
  const open = useSurfaceStore((state) => state.open);
  const hydrate = useSurfaceStore((state) => state.hydrate);
  const close = useSurfaceStore((state) => state.close);
  const closeMany = useSurfaceStore((state) => state.closeMany);
  const closeTop = useSurfaceStore((state) => state.closeTop);
  const closeAll = useSurfaceStore((state) => state.closeAll);
  const stack = useSurfaceStore((state) => state.stack);

  return {
    open,
    hydrate,
    close,
    closeMany,
    closeTop,
    closeAll,
    isOpen: (id: string) => stack.some((surface) => surface.id === id),
  };
}
