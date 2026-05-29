import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import {
  getCaseComposerColorToken,
  type CaseComposerColorToken,
} from "./composer/CaseColorPalette";
import type { CaseComposerEditorToolbarActions } from "./composer/CaseComposerEditor";
import { CaseComposerToolbar } from "./composer/CaseComposerToolbar";
import { blurActiveComposerElement } from "./composer/blur-active-composer-element";
import type { CaseComposerToolbarState } from "../lib/case-lexical-serialization";
import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";

const LazyCaseComposerEditor = lazy(() =>
  import("./composer/CaseComposerEditor").then((module) => ({
    default: module.CaseComposerEditor,
  })),
);

const EMPTY_TOOLBAR_STATE: CaseComposerToolbarState = {
  activeColor: null,
  big: false,
  bold: false,
  color: false,
  pulse: false,
  shake: false,
  underline: false,
};

type CaseComposerExpandedTool = "color";

type CaseInitialMessageComposerProps = {
  className?: string;
  placeholder?: string;
};

export function CaseInitialMessageComposer({
  className,
  placeholder = "Add a description…",
}: CaseInitialMessageComposerProps): React.JSX.Element {
  const { composerContent, setComposerContent } = useCaseCreationFormContext();

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [toolbarActions, setToolbarActions] =
    useState<CaseComposerEditorToolbarActions | null>(null);
  const [toolbarState, setToolbarState] =
    useState<CaseComposerToolbarState>(EMPTY_TOOLBAR_STATE);
  const [expandedTool, setExpandedTool] =
    useState<CaseComposerExpandedTool | null>(null);
  const [pulsePreviewTick, setPulsePreviewTick] = useState(0);
  const [shakePreviewTick, setShakePreviewTick] = useState(0);

  const handleToolbarActionsReady = useCallback(
    (nextActions: CaseComposerEditorToolbarActions | null) => {
      setToolbarActions(nextActions);

      if (nextActions === null) {
        setExpandedTool(null);
        setToolbarState(EMPTY_TOOLBAR_STATE);
      }
    },
    [],
  );

  const handleExpandedColorSelect = useCallback(
    (colorToken: CaseComposerColorToken) => {
      toolbarActions?.applyColor(colorToken);
    },
    [toolbarActions],
  );

  const handleExpandedToolCollapse = useCallback(() => {
    toolbarActions?.applyColor("default");
    setExpandedTool(null);
  }, [toolbarActions]);

  const handleEditorFocus = useCallback(() => {
    setIsEditorFocused(true);
  }, []);

  const handleEditorBlur = useCallback(() => {
    setIsEditorFocused(false);
    setExpandedTool(null);
  }, []);

  const handleDone = useCallback(() => {
    blurActiveComposerElement();
  }, []);

  // On mobile, scrolling dismisses the keyboard but never fires a blur event
  // on the contenteditable. Detect keyboard dismissal via visualViewport height
  // growing and treat it as a blur.
  useEffect(() => {
    if (!isEditorFocused || !window.visualViewport) {
      return;
    }

    let lastHeight = window.visualViewport.height;

    const handleViewportResize = () => {
      const currentHeight = window.visualViewport!.height;

      if (currentHeight > lastHeight) {
        (document.activeElement as HTMLElement | null)?.blur();
      }

      lastHeight = currentHeight;
    };

    window.visualViewport.addEventListener("resize", handleViewportResize);

    return () => {
      window.visualViewport!.removeEventListener(
        "resize",
        handleViewportResize,
      );
    };
  }, [isEditorFocused]);

  const toolbarButtonActions = {
    big: () => {
      toolbarActions?.toggleBig();
    },
    bold: () => {
      toolbarActions?.toggleBold();
    },
    color: () => {
      setExpandedTool("color");
    },
    mention: () => {
      toolbarActions?.openMentionPicker();
    },
    pulse: () => {
      toolbarActions?.togglePulse();
      setPulsePreviewTick((v) => v + 1);
    },
    shake: () => {
      toolbarActions?.toggleShake();
      setShakePreviewTick((v) => v + 1);
    },
    underline: () => {
      toolbarActions?.toggleUnderline();
    },
  } satisfies Record<
    "big" | "bold" | "color" | "mention" | "pulse" | "shake" | "underline",
    () => void
  >;

  return (
    <div
      className={className}
      data-testid="case-initial-message-composer"
    >
      {isEditorFocused ? (
        <div className="mb-2 rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
          <CaseComposerToolbar
            actions={toolbarButtonActions}
            disabled={toolbarActions === null}
            expandedColorToken={getCaseComposerColorToken(
              toolbarState.activeColor,
            )}
            expandedTool={expandedTool}
            onCollapseExpandedTool={handleExpandedToolCollapse}
            onSelectExpandedColor={handleExpandedColorSelect}
            pulsePreviewTick={pulsePreviewTick}
            shakePreviewTick={shakePreviewTick}
            state={toolbarState}
          />
        </div>
      ) : null}

      <div className="rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
            <Suspense
              fallback={
                <div className="min-h-9 px-3 py-2 text-base text-muted-foreground">
                  Loading composer...
                </div>
              }
            >
              <LazyCaseComposerEditor
                content={composerContent}
                onBlur={handleEditorBlur}
                onChange={({ content, plainText }) => {
                  setComposerContent(content, plainText);
                }}
                onFocus={handleEditorFocus}
                onToolbarActionsReady={handleToolbarActionsReady}
                onToolbarStateChange={setToolbarState}
                placeholder={placeholder}
              />
            </Suspense>
          </div>

          {isEditorFocused ? (
            <button
              className="mr-0.5 self-end rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-muted"
              data-testid="case-initial-message-composer-done"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDone}
              type="button"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
