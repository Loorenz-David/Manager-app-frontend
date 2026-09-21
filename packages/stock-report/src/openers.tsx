import { createContext, useContext, type ReactNode } from "react";
import type { TaskCreationCallbacks } from "@beyo/task-creation";

export type StockReportSurfaceOpeners = {
  openTaskCreation?: (stockNeedId: string, callbacks: TaskCreationCallbacks) => void;
  openTaskDetail?: (taskId: string) => void;
  openImageViewer?: (taskId: string) => void;
};

const StockReportOpenersContext = createContext<StockReportSurfaceOpeners>({});
export function StockReportOpenersProvider({ children, openers }: { children: ReactNode; openers: StockReportSurfaceOpeners }): React.JSX.Element { return <StockReportOpenersContext.Provider value={openers}>{children}</StockReportOpenersContext.Provider>; }
export function useStockReportOpeners(): StockReportSurfaceOpeners { return useContext(StockReportOpenersContext); }
