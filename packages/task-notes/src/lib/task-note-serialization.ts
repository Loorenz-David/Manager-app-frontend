import {
  normalizeBackendRichTextContent,
  richTextToBackendBlocks,
  type BackendRichTextBlock,
  type RichTextContent,
} from "@beyo/lib";

import type { TaskNoteComposerValue, TaskNoteContentBlock } from "../types";

export function hasMeaningfulNoteContent(
  value: TaskNoteComposerValue | null | undefined,
): boolean {
  return Boolean(value && value.plainText.trim().length > 0);
}

export function toTaskNoteContentBlocks(
  content: RichTextContent,
): TaskNoteContentBlock[] {
  return richTextToBackendBlocks(content) as TaskNoteContentBlock[];
}

export function fromBackendNoteContent(
  blocks: TaskNoteContentBlock[] | null | undefined,
): RichTextContent {
  if (!blocks || blocks.length === 0) {
    return { parts: [] };
  }

  return normalizeBackendRichTextContent(blocks as BackendRichTextBlock[]);
}

export function plainTextToComposerContent(text: string): RichTextContent {
  return {
    parts: text.trim() ? [{ kind: "text", text }] : [],
  };
}
