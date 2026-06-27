import { createContext, useContext, useState, type ReactNode } from "react";

import { useAuthStore, selectUser } from "@beyo/auth";
import { generateClientId } from "@beyo/lib";

type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
  currentUserClientId: string;
  regenerateIds: () => void;
};

const TaskCreationFormContext =
  createContext<TaskCreationFormContextValue | null>(null);

type TaskCreationFormProviderProps = {
  children: ReactNode;
};

export function TaskCreationFormProvider({
  children,
}: TaskCreationFormProviderProps): React.JSX.Element {
  const user = useAuthStore(selectUser);
  const currentUserClientId = String(user?.id ?? "");

  const [taskClientId, setTaskClientId] = useState(() =>
    generateClientId("ExecutionTask"),
  );
  const [itemClientId, setItemClientId] = useState(() =>
    generateClientId("Item"),
  );
  const [customerClientId, setCustomerClientId] = useState(() =>
    generateClientId("Customer"),
  );
  const [noteClientId, setNoteClientId] = useState(() =>
    generateClientId("TaskNote"),
  );

  function regenerateIds(): void {
    setTaskClientId(generateClientId("ExecutionTask"));
    setItemClientId(generateClientId("Item"));
    setCustomerClientId(generateClientId("Customer"));
    setNoteClientId(generateClientId("TaskNote"));
  }

  return (
    <TaskCreationFormContext.Provider
      value={{
        taskClientId,
        itemClientId,
        customerClientId,
        noteClientId,
        currentUserClientId,
        regenerateIds,
      }}
    >
      {children}
    </TaskCreationFormContext.Provider>
  );
}

export function useTaskCreationFormContext(): TaskCreationFormContextValue {
  const context = useContext(TaskCreationFormContext);

  if (!context) {
    throw new Error(
      "useTaskCreationFormContext must be used inside TaskCreationFormProvider",
    );
  }

  return context;
}
