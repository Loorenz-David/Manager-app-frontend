import {
  RichTextContentView,
  normalizeBackendRichTextContent,
  type BackendRichTextBlock,
} from "@beyo/lib";

import type { TaskNoteContentBlock } from "../types";

type TaskNoteContentViewProps = {
  content: TaskNoteContentBlock[];
  plainText?: string;
  testId?: string;
};

export function TaskNoteContentView({
  content,
  plainText = "",
  testId = "task-note-content-view",
}: TaskNoteContentViewProps): React.JSX.Element {
  const fallbackText = plainText.trim();
  const normalizedContent = normalizeBackendRichTextContent(
    content as BackendRichTextBlock[],
  );

  if (content.length === 0 && !fallbackText) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
        data-testid={testId}
      >
        No note content.
      </div>
    );
  }

  if (normalizedContent.parts.length === 0 && fallbackText) {
    return (
      <p
        className="whitespace-pre-wrap text-sm leading-6 text-foreground"
        data-testid={testId}
      >
        {fallbackText}
      </p>
    );
  }

  return (
    <div data-testid={testId}>
      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-foreground">
        <RichTextContentView content={normalizedContent} enableAnimations />
      </p>
    </div>
  );
}
