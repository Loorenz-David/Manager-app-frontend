import {
  hasMeaningfulNoteContent,
  type TaskNoteComposerValue,
} from "@beyo/task-notes";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * The note is author-controlled free text landing in an HTML field, so it is
 * escaped rather than interpolated — a stray `<` must render as a character,
 * never as markup.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/**
 * Renders the pre-order note as `shopify_preorder.product.description`.
 *
 * Shopify treats the description as HTML, so the note's plain text is split on
 * line breaks and each line wrapped in a paragraph. Sending the raw string
 * instead would collapse every line into one run-on block. Only the text
 * carries over — rich formatting stays in the note itself, which is still
 * created exactly as before.
 */
export function toShopifyProductDescription(
  noteContent: TaskNoteComposerValue | null | undefined,
): string | undefined {
  if (!hasMeaningfulNoteContent(noteContent) || !noteContent) {
    return undefined;
  }

  const paragraphs = noteContent.plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (paragraphs.length === 0) {
    return undefined;
  }

  return paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}
