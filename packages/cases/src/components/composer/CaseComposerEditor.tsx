import { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from "lexical";

import { cn } from "@beyo/lib";

import type { CaseMessageContent } from "../../message-content";
import type { CaseComposerColorToken } from "./CaseColorPalette";
import {
  CASE_RICH_TEXT_TEST_IDS,
  initializeCaseComposerEditorState,
  insertCaseComposerMentionTrigger,
  readCaseComposerToolbarState,
  registerCaseComposerFormattingShortcuts,
  serializeCaseEditorState,
  setCaseComposerColor,
  setCaseComposerEditorContent,
  toggleCaseComposerAnimation,
  toggleCaseComposerBold,
  toggleCaseComposerSize,
  toggleCaseComposerUnderline,
  type CaseComposerToolbarState,
} from "../../lib/case-lexical-serialization";
import { toBackendPlainText } from "../../lib/message-content-adapter";

type CaseComposerEditorChange = {
  content: CaseMessageContent;
  plainText: string;
};

export type CaseComposerEditorToolbarActions = {
  applyColor: (colorToken: CaseComposerColorToken) => void;
  openMentionPicker: () => void;
  toggleBig: () => void;
  toggleBold: () => void;
  togglePulse: () => void;
  toggleShake: () => void;
  toggleSmall: () => void;
  toggleUnderline: () => void;
};

type CaseComposerEditorProps = {
  className?: string;
  content: CaseMessageContent;
  disabled?: boolean;
  onBlur?: () => void;
  onChange: (change: CaseComposerEditorChange) => void;
  onFocus?: () => void;
  onToolbarActionsReady?: (
    actions: CaseComposerEditorToolbarActions | null,
  ) => void;
  onToolbarStateChange?: (state: CaseComposerToolbarState) => void;
  placeholder: string;
};

const theme = {
  paragraph: "m-0",
  text: {
    bold: "font-semibold",
    underline: "underline underline-offset-2",
  },
};

function ComparisonSyncPlugin({
  content,
  lastAppliedSnapshotRef,
  lastEmittedSnapshotRef,
}: {
  content: CaseMessageContent;
  lastAppliedSnapshotRef: React.MutableRefObject<string>;
  lastEmittedSnapshotRef: React.MutableRefObject<string>;
}): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const nextSnapshot = JSON.stringify(content);

  useEffect(() => {
    if (nextSnapshot === lastAppliedSnapshotRef.current) {
      return;
    }

    if (nextSnapshot === lastEmittedSnapshotRef.current) {
      lastAppliedSnapshotRef.current = nextSnapshot;
      return;
    }

    setCaseComposerEditorContent(editor, content);
    lastAppliedSnapshotRef.current = nextSnapshot;
    lastEmittedSnapshotRef.current = nextSnapshot;
  }, [content, editor, nextSnapshot]);

  useEffect(() => {
    return registerCaseComposerFormattingShortcuts(editor);
  }, [editor]);

  return null;
}

function ChangeBridgePlugin({
  lastEmittedSnapshotRef,
  onChange,
}: {
  lastEmittedSnapshotRef: React.MutableRefObject<string>;
  onChange: (change: CaseComposerEditorChange) => void;
}): React.JSX.Element {
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        const content = serializeCaseEditorState(editorState);
        lastEmittedSnapshotRef.current = JSON.stringify(content);

        onChange({
          content,
          plainText: toBackendPlainText(content),
        });
      }}
    />
  );
}

function createToolbarActions(
  editor: Parameters<typeof toggleCaseComposerBold>[0],
): CaseComposerEditorToolbarActions {
  // Collapsed selections intentionally use Lexical's insertion-style behavior so
  // toolbar taps stay deterministic on mobile instead of guessing the current word.
  return {
    applyColor: (colorToken) => {
      setCaseComposerColor(editor, colorToken);
    },
    openMentionPicker: () => {
      insertCaseComposerMentionTrigger(editor);
    },
    toggleBig: () => {
      toggleCaseComposerSize(editor, "large");
    },
    toggleBold: () => {
      toggleCaseComposerBold(editor);
    },
    togglePulse: () => {
      toggleCaseComposerAnimation(editor, "pulse");
    },
    toggleShake: () => {
      toggleCaseComposerAnimation(editor, "shake");
    },
    toggleSmall: () => {
      toggleCaseComposerSize(editor, "small");
    },
    toggleUnderline: () => {
      toggleCaseComposerUnderline(editor);
    },
  };
}

function ToolbarBridgePlugin({
  onToolbarActionsReady,
  onToolbarStateChange,
}: {
  onToolbarActionsReady?: (
    actions: CaseComposerEditorToolbarActions | null,
  ) => void;
  onToolbarStateChange?: (state: CaseComposerToolbarState) => void;
}): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const lastToolbarStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onToolbarStateChange) {
      return;
    }

    const emitToolbarState = (state: CaseComposerToolbarState) => {
      const nextSnapshot = JSON.stringify(state);

      if (nextSnapshot === lastToolbarStateRef.current) {
        return;
      }

      lastToolbarStateRef.current = nextSnapshot;
      onToolbarStateChange(state);
    };

    editor.getEditorState().read(() => {
      emitToolbarState(readCaseComposerToolbarState());
    });

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          emitToolbarState(readCaseComposerToolbarState());
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          editor.getEditorState().read(() => {
            emitToolbarState(readCaseComposerToolbarState());
          });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, onToolbarStateChange]);

  useEffect(() => {
    if (!onToolbarActionsReady) {
      return;
    }

    onToolbarActionsReady(createToolbarActions(editor));

    return () => {
      onToolbarActionsReady(null);
    };
  }, [editor, onToolbarActionsReady]);

  return null;
}

export function CaseComposerEditor({
  className,
  content,
  disabled = false,
  onBlur,
  onChange,
  onFocus,
  onToolbarActionsReady,
  onToolbarStateChange,
  placeholder,
}: CaseComposerEditorProps): React.JSX.Element {
  const initialSnapshot = JSON.stringify(content);
  const lastAppliedSnapshotRef = useRef(initialSnapshot);
  const lastEmittedSnapshotRef = useRef(initialSnapshot);
  const userInitiatedFocusRef = useRef(false);
  const userInitiatedFocusResetTimeoutRef = useRef<number | null>(null);
  // Lexical triggers a focus event during initialization. Suppress it so the
  // editor does not steal focus (and open the mobile keyboard) on page load.
  const suppressFocusOnMountRef = useRef(true);
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      suppressFocusOnMountRef.current = false;
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    return () => {
      if (userInitiatedFocusResetTimeoutRef.current !== null) {
        window.clearTimeout(userInitiatedFocusResetTimeoutRef.current);
      }
    };
  }, []);

  const markNextFocusAsUserInitiated = () => {
    userInitiatedFocusRef.current = true;

    if (userInitiatedFocusResetTimeoutRef.current !== null) {
      window.clearTimeout(userInitiatedFocusResetTimeoutRef.current);
    }

    userInitiatedFocusResetTimeoutRef.current = window.setTimeout(() => {
      userInitiatedFocusRef.current = false;
      userInitiatedFocusResetTimeoutRef.current = null;
    }, 300);
  };

  return (
    <LexicalComposer
      initialConfig={{
        editable: !disabled,
        editorState: () => {
          initializeCaseComposerEditorState(content);
        },
        namespace: "case-composer-editor",
        onError: (error) => {
          throw error;
        },
        theme,
      }}
    >
      <ComparisonSyncPlugin
        content={content}
        lastAppliedSnapshotRef={lastAppliedSnapshotRef}
        lastEmittedSnapshotRef={lastEmittedSnapshotRef}
      />
      <ChangeBridgePlugin
        lastEmittedSnapshotRef={lastEmittedSnapshotRef}
        onChange={onChange}
      />
      <ToolbarBridgePlugin
        onToolbarActionsReady={onToolbarActionsReady}
        onToolbarStateChange={onToolbarStateChange}
      />
      <EditableStatePlugin disabled={disabled} />
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={
          <ContentEditable
            aria-label={placeholder}
            className={cn(
              "min-h-9 max-h-32 overflow-y-auto bg-transparent px-3 py-2 text-base leading-6 text-foreground outline-none scrollbar-none [&::-webkit-scrollbar]:hidden disabled:cursor-not-allowed",
              className,
            )}
            data-testid={CASE_RICH_TEXT_TEST_IDS.editor}
            onBlur={onBlur}
            onMouseDown={markNextFocusAsUserInitiated}
            onFocus={(event) => {
              if (
                suppressFocusOnMountRef.current &&
                !userInitiatedFocusRef.current
              ) {
                event.currentTarget.blur();
                return;
              }

              userInitiatedFocusRef.current = false;
              onFocus?.();
            }}
            onTouchStart={markNextFocusAsUserInitiated}
            spellCheck
          />
        }
        placeholder={
          <div className="pointer-events-none absolute inset-x-3 top-2 text-base text-muted-foreground">
            {placeholder}
          </div>
        }
      />
    </LexicalComposer>
  );
}

function EditableStatePlugin({
  disabled,
}: {
  disabled: boolean;
}): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  return null;
}
