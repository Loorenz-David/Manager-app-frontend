import { useSurface } from '@/hooks/use-surface';

export type TestSurfaceController = {
  openSheet: () => void;
  openSlide: () => void;
  openNestedSheet: () => void;
  openNestedSlide: () => void;
};

export function useTestSurfaceController(): TestSurfaceController {
  const { open } = useSurface();

  return {
    openSheet: () => open('test-sheet'),
    openSlide: () => open('test-slide'),
    openNestedSheet: () => open('test-sheet-nested'),
    openNestedSlide: () => open('test-slide-nested'),
  };
}
