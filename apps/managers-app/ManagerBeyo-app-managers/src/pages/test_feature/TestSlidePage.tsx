import { TestSlideContent, TestSurfaceProvider } from '@/features/test_feature';

export function TestSlidePage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestSlideContent />
    </TestSurfaceProvider>
  );
}
