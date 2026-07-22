import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useRecordViewState } from "./actions/useRecordViewState";
import { useActivePresentation } from "./api/active-presentation";
import type { PresentationsSurfaceOpeners } from "./surface-ids";
import type { PresentationSurfaceProps } from "./surfaces/presentation-surface-props";
import type { ConsumerPresentation, PresentationViewAction } from "./types";

export type ActivePresentationProviderProps = {
  appKey: string;
  surfaceOpeners: PresentationsSurfaceOpeners;
  navigate: (route: string) => void;
  children: ReactNode;
};

export function ActivePresentationProvider({
  appKey,
  surfaceOpeners,
  navigate,
  children,
}: ActivePresentationProviderProps): React.JSX.Element {
  const activeQuery = useActivePresentation(appKey);
  const { record } = useRecordViewState();
  const [cycle, setCycle] = useState(0);
  const currentIdRef = useRef<string | null>(null);
  const furthestSlideRef = useRef(0);
  const terminalStartedRef = useRef(false);
  const terminalRecordedRef = useRef(false);
  const closeHandledRef = useRef(false);
  const suppressedIdRef = useRef<string | null>(null);

  const recordFor = useCallback(
    (
      presentation: ConsumerPresentation,
      action: PresentationViewAction,
      lastSlideIndex?: number,
    ) => record({
      presentationClientId: presentation.client_id,
      version: presentation.version,
      action,
      lastSlideIndex,
      isDismissible: presentation.is_dismissible,
    }),
    [record],
  );

  useEffect(() => {
    const presentation = activeQuery.data;
    if (!presentation) {
      if (currentIdRef.current === null) suppressedIdRef.current = null;
      return;
    }
    if (
      currentIdRef.current !== null
      || suppressedIdRef.current === presentation.client_id
    ) return;

    const opener = presentation.presentation_type === "modal"
      ? surfaceOpeners.openPresentationModal
      : presentation.presentation_type === "full_screen"
        ? surfaceOpeners.openPresentationFullScreen
        : surfaceOpeners.openPresentationSlidePage;
    if (!opener) return;

    currentIdRef.current = presentation.client_id;
    furthestSlideRef.current = 0;
    terminalStartedRef.current = false;
    terminalRecordedRef.current = false;
    closeHandledRef.current = false;

    const progress = async (lastSlideIndex: number) => {
      if (lastSlideIndex <= furthestSlideRef.current || terminalStartedRef.current) return;
      furthestSlideRef.current = lastSlideIndex;
      await recordFor(presentation, "progressed", lastSlideIndex);
    };

    const terminal = async (action: "dismissed" | "completed", lastSlideIndex: number) => {
      if (terminalStartedRef.current) return;
      if (action === "dismissed" && !presentation.is_dismissible) return;
      terminalStartedRef.current = true;
      furthestSlideRef.current = Math.max(furthestSlideRef.current, lastSlideIndex);
      terminalRecordedRef.current = (await recordFor(
        presentation,
        action,
        furthestSlideRef.current,
      )) !== null;
    };

    const onClosed = async () => {
      if (closeHandledRef.current) return;
      closeHandledRef.current = true;
      const finishedId = presentation.client_id;
      const result = await activeQuery.refetch();
      if (!terminalRecordedRef.current && result.data?.client_id === finishedId) {
        suppressedIdRef.current = finishedId;
      } else if (result.data?.client_id !== finishedId) {
        suppressedIdRef.current = null;
      }
      currentIdRef.current = null;
      setCycle((value) => value + 1);
    };

    const surfaceProps: PresentationSurfaceProps = {
      presentation,
      navigate,
      onProgress: progress,
      onDismiss: (index) => terminal("dismissed", index),
      onComplete: (index) => terminal("completed", index),
      onMediaExpired: async () => (await activeQuery.refetch()).data ?? null,
      onClosed,
    };
    opener(surfaceProps);
    void recordFor(presentation, "shown", 0);
  }, [
    activeQuery.data,
    activeQuery.refetch,
    cycle,
    navigate,
    recordFor,
    surfaceOpeners.openPresentationFullScreen,
    surfaceOpeners.openPresentationModal,
    surfaceOpeners.openPresentationSlidePage,
  ]);

  return <>{children}</>;
}

