import { createContext, useContext, type ReactNode } from "react";
import type { TaskCreationCallbacks } from "@beyo/task-creation";
import type { StockMatchWarningSurfaceProps } from "./surface-ids";

export type StockReportSurfaceOpeners = {
  openTaskCreation?: (stockNeedId: string, callbacks: TaskCreationCallbacks) => void;
  openTaskDetail?: (taskId: string) => void;
  openImageViewer?: (
    taskId: string,
    itemId: string | null,
    images: Array<{ clientId: string; imageUrl: string }>,
  ) => void;
  openMatchWarning?: (props: StockMatchWarningSurfaceProps) => void;
};

const StockReportOpenersContext = createContext<StockReportSurfaceOpeners>({});
export function StockReportOpenersProvider({ children, openers }: { children: ReactNode; openers: StockReportSurfaceOpeners }): React.JSX.Element { return <StockReportOpenersContext.Provider value={openers}>{children}</StockReportOpenersContext.Provider>; }
export function useStockReportOpeners(): StockReportSurfaceOpeners { return useContext(StockReportOpenersContext); }
