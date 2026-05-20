import { createContext, useContext, type ReactNode } from 'react';
import {
  useTestSurfaceController,
  type TestSurfaceController,
} from '../controllers/use-test-surface.controller';

const TestSurfaceContext = createContext<TestSurfaceController | null>(null);

type Props = {
  children: ReactNode;
};

export function useTestSurfaceContext(): TestSurfaceController {
  const context = useContext(TestSurfaceContext);

  if (context === null) {
    throw new Error('useTestSurfaceContext must be used inside TestSurfaceProvider');
  }

  return context;
}

export function TestSurfaceProvider({ children }: Props): React.JSX.Element {
  const controller = useTestSurfaceController();

  return <TestSurfaceContext.Provider value={controller}>{children}</TestSurfaceContext.Provider>;
}
