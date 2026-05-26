import { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { cn } from "@/lib/utils";

import type { CaseMessageContent } from "../../message-content";
import {
  CASE_RICH_TEXT_TEST_IDS,
  initializeCaseComposerEditorState,
  registerCaseComposerFormattingShortcuts,
  serializeCaseEditorState,
  setCaseComposerEditorContent,
} from "../../lib/case-lexical-serialization";
import { toBackendPlainText } from "../../lib/message-content-adapter";

type CaseComposerEditorChange = {
  content: CaseMessageContent;
  plainText: string;
};

type CaseComposerEditorProps = {
  className?: string;
  content: CaseMessageContent;
  disabled?: boolean;
  onBlur?: () => void;
  onChange: (change: CaseComposerEditorChange) => void;
  onFocus?: () => void;
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

export function CaseComposerEditor({
  className,
  content,
  disabled = false,
  onBlur,
  onChange,
  onFocus,
  placeholder,
}: CaseComposerEditorProps): React.JSX.Element {
  const initialSnapshot = JSON.stringify(content);
  const lastAppliedSnapshotRef = useRef(initialSnapshot);
  const lastEmittedSnapshotRef = useRef(initialSnapshot);

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
            onFocus={onFocus}
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
