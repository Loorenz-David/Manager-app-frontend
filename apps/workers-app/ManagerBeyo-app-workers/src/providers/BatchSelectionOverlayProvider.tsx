import { createContext, useCallback, useContext, useState } from "react";

type BatchSelectionOverlayContextValue = {
  isSelecting: boolean;
  setIsSelecting: (value: boolean) => void;
};

const BatchSelectionOverlayContext =
  createContext<BatchSelectionOverlayContextValue | null>(null);

export function BatchSelectionOverlayProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isSelecting, setIsSelectingState] = useState(false);
  const setIsSelecting = useCallback(
    (v: boolean) => setIsSelectingState(v),
    [],
  );

  return (
    <BatchSelectionOverlayContext.Provider value={{ isSelecting, setIsSelecting }}>
      {children}
    </BatchSelectionOverlayContext.Provider>
  );
}

export function useBatchSelectionOverlay(): BatchSelectionOverlayContextValue {
  const ctx = useContext(BatchSelectionOverlayContext);
  if (!ctx) {
    throw new Error(
      "useBatchSelectionOverlay must be used inside BatchSelectionOverlayProvider",
    );
  }
  return ctx;
}
