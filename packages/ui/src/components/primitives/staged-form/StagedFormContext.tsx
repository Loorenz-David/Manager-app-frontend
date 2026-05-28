import { createContext, useContext } from 'react';

import type { StagedFormContextValue } from './staged-form.types';

export const StagedFormContext = createContext<StagedFormContextValue | null>(null);

export function useStagedFormContext(): StagedFormContextValue {
  const context = useContext(StagedFormContext);

  if (!context) {
    throw new Error('useStagedFormContext must be used inside <StagedForm>');
  }

  return context;
}
