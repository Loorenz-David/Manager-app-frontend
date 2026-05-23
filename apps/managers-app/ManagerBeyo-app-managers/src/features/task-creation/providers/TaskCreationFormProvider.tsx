import { createContext, useContext, useState, type ReactNode } from 'react';

import { generateClientId } from '@/lib/client-id';

type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  regenerateIds: () => void;
};

const TaskCreationFormContext = createContext<TaskCreationFormContextValue | null>(null);

type TaskCreationFormProviderProps = {
  children: ReactNode;
};

export function TaskCreationFormProvider({
  children,
}: TaskCreationFormProviderProps): React.JSX.Element {
  const [taskClientId, setTaskClientId] = useState(() => generateClientId('ExecutionTask'));
  const [itemClientId, setItemClientId] = useState(() => generateClientId('Item'));
  const [customerClientId, setCustomerClientId] = useState(() =>
    generateClientId('Customer'),
  );

  function regenerateIds(): void {
    setTaskClientId(generateClientId('ExecutionTask'));
    setItemClientId(generateClientId('Item'));
    setCustomerClientId(generateClientId('Customer'));
  }

  return (
    <TaskCreationFormContext.Provider
      value={{ taskClientId, itemClientId, customerClientId, regenerateIds }}
    >
      {children}
    </TaskCreationFormContext.Provider>
  );
}

export function useTaskCreationFormContext(): TaskCreationFormContextValue {
  const context = useContext(TaskCreationFormContext);

  if (!context) {
    throw new Error('useTaskCreationFormContext must be used inside TaskCreationFormProvider');
  }

  return context;
}
