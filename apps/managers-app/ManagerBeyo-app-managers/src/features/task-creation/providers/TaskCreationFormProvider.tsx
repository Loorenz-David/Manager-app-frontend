import { createContext, useContext, useRef, type ReactNode } from 'react';

import { generateClientId } from '@/lib/client-id';

type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
};

const TaskCreationFormContext = createContext<TaskCreationFormContextValue | null>(null);

type TaskCreationFormProviderProps = {
  children: ReactNode;
};

export function TaskCreationFormProvider({
  children,
}: TaskCreationFormProviderProps): React.JSX.Element {
  const taskClientId = useRef(generateClientId('ExecutionTask')).current;
  const itemClientId = useRef(generateClientId('Item')).current;
  const customerClientId = useRef(generateClientId('Customer')).current;

  return (
    <TaskCreationFormContext.Provider value={{ taskClientId, itemClientId, customerClientId }}>
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
