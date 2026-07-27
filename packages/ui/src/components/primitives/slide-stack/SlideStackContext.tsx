import { createContext, useContext } from 'react';

import type { SlideStackContextValue } from './slide-stack.types';

export const SlideStackContext = createContext<SlideStackContextValue | null>(null);

export function useSlideStackContext(): SlideStackContextValue {
  const context = useContext(SlideStackContext);

  if (!context) {
    throw new Error('useSlideStackContext must be used inside <SlideStack>');
  }

  return context;
}
