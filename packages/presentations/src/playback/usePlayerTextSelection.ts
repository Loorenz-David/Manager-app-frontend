import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearTextSelection,
  hasActiveTextSelection,
  selectTextAtPoint,
} from "./text-selection";

export type PlayerTextSelection = {
  /** True while text is selected — the tap overlay stands down so the user can work with it. */
  isSelecting: boolean;
  attachContainer: (node: HTMLDivElement | null) => void;
  /** Selects the text block under the point; false when the press missed all text. */
  selectAt: (clientX: number, clientY: number) => boolean;
  clear: () => void;
};

export function usePlayerTextSelection(): PlayerTextSelection {
  const [isSelecting, setIsSelecting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  const selectAt = useCallback((clientX: number, clientY: number) => {
    const root = containerRef.current;
    if (!root) return false;
    const selected = selectTextAtPoint(root, clientX, clientY);
    if (selected) setIsSelecting(true);
    return selected;
  }, []);

  const clear = useCallback(() => {
    clearTextSelection();
    setIsSelecting(false);
  }, []);

  // Tapping away collapses the selection natively; that is the signal to take the deck back.
  useEffect(() => {
    if (!isSelecting) return undefined;
    const handleSelectionChange = () => {
      if (!hasActiveTextSelection()) setIsSelecting(false);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [isSelecting]);

  return { isSelecting, attachContainer, selectAt, clear };
}
