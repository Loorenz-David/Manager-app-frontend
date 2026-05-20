import { TestSheetContent, TestSurfaceProvider } from '@/features/test_feature';

export function TestSheetPage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestSheetContent />
    </TestSurfaceProvider>
  );
}
