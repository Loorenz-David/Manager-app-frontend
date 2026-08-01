import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useSurface, useSurfaceHeader } from "@beyo/hooks";
import { PauseReasonPicker } from "@beyo/pause-reasons";
import { tabVariants, transitions } from "@beyo/lib";
import { useWorkerStateSheetController } from "@/features/home/controllers/use-worker-state-sheet.controller";

function PauseReasonPickerSkeleton(): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-2 gap-2"
      data-testid="worker-state-reasons-loading"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          aria-hidden="true"
          className="skeleton-shimmer h-28 rounded-xl"
          key={index}
        />
      ))}
    </div>
  );
}

export function WorkerStateSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();

  const closeSheet = useCallback(() => {
    if (header) {
      header.requestClose();
      return;
    }
    closeTop();
  }, [closeTop, header]);

  const {
    reasons,
    isReasonsPending,
    isReasonsError,
    isDeclaring,
    inlineError,
    view,
    selectedReason,
    description,
    setDescription,
    handleSelectReason,
    handleConfirmDescription,
    handleBackToPicker,
  } = useWorkerStateSheetController(closeSheet);

  const [pickerViewHeightPx, setPickerViewHeightPx] = useState<number | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerViewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    header?.setTitle("Your state");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    const element = pickerViewRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setPickerViewHeightPx(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [view]);

  return (
    <div
      className="relative min-h-80 bg-background"
      data-testid="worker-state-sheet"
      style={
        pickerViewHeightPx !== null
          ? { minHeight: `${pickerViewHeightPx}px` }
          : undefined
      }
    >
      <AnimatePresence custom={1} initial={false} mode="wait">
        {view === "picker" ? (
          <m.div
            key="worker-state-picker-view"
            animate="center"
            className="px-4 pb-4 pt-2"
            custom={1}
            exit="exit"
            initial="enter"
            ref={pickerViewRef}
            transition={transitions.tab}
            variants={tabVariants}
          >
            <div className="mb-3 text-sm font-medium text-foreground">
              What are you doing right now?
            </div>

            {inlineError ? (
              <div
                className="mb-3 rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
                data-testid="worker-state-error"
                role="alert"
              >
                {inlineError}
              </div>
            ) : null}

            {isReasonsPending ? <PauseReasonPickerSkeleton /> : null}
            {!isReasonsPending && isReasonsError ? (
              <div
                className="rounded-xl border border-border p-4 text-sm text-muted-foreground"
                data-testid="worker-state-reasons-error"
              >
                Reasons could not be loaded.
              </div>
            ) : null}
            {!isReasonsPending && !isReasonsError && reasons.length === 0 ? (
              <div
                className="rounded-xl border border-border p-4 text-sm text-muted-foreground"
                data-testid="worker-state-reasons-empty"
              >
                No personal reasons are available.
              </div>
            ) : null}
            {!isReasonsPending && !isReasonsError && reasons.length > 0 ? (
              <PauseReasonPicker
                data-testid="worker-state-reason-picker"
                disabled={isDeclaring}
                reasons={reasons}
                onSelect={handleSelectReason}
              />
            ) : null}
          </m.div>
        ) : (
          <m.div
            key="worker-state-description-view"
            animate="center"
            className="flex flex-col gap-3 px-4 pb-4 pt-2"
            custom={1}
            exit="exit"
            initial="enter"
            style={
              pickerViewHeightPx !== null
                ? { minHeight: `${pickerViewHeightPx}px` }
                : undefined
            }
            transition={transitions.tab}
            variants={tabVariants}
            onAnimationComplete={() => {
              textareaRef.current?.focus();
            }}
          >
            <div className="flex items-center gap-2">
              <button
                aria-label="Back"
                className="rounded-lg border border-border p-2 text-foreground"
                data-testid="worker-state-back-button"
                type="button"
                onClick={handleBackToPicker}
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-sm font-medium text-muted-foreground">
                {selectedReason?.name ?? "Details"}
              </span>
            </div>

            {inlineError ? (
              <div
                className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
                data-testid="worker-state-error"
                role="alert"
              >
                {inlineError}
              </div>
            ) : null}

            <textarea
              ref={textareaRef}
              aria-label="State description"
              className="h-36 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-primary"
              data-testid="worker-state-description-input"
              placeholder="Describe the reason..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <button
              className="mt-auto w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
              data-testid="worker-state-submit-button"
              disabled={isDeclaring || description.trim().length === 0}
              type="button"
              onClick={handleConfirmDescription}
            >
              Set state
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
