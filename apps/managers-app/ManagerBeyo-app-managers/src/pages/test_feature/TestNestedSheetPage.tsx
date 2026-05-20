import { TestNestedSheetContent, TestSurfaceProvider } from '@/features/test_feature';

export function TestNestedSheetPage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestNestedSheetContent />
    </TestSurfaceProvider>
  );
}
