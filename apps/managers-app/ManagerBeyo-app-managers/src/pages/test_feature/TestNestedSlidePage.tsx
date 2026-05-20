import { TestNestedSlideContent, TestSurfaceProvider } from '@/features/test_feature';

export function TestNestedSlidePage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestNestedSlideContent />
    </TestSurfaceProvider>
  );
}
