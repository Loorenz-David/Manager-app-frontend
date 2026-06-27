import {
  normalizeBackendRichTextContent,
  richTextToBackendBlocks,
} from "@beyo/lib";

import type { CaseInlinePart, CaseMessageContent } from '../message-content';
import type { MentionResolution, MessageContentBlock } from '../types';

function getReadableText(part: CaseInlinePart): string {
  if (part.kind === 'label') {
    return part.text || part.value;
  }

  if (part.kind === 'link') {
    return part.text || part.href;
  }

  return part.text;
}


export function fromBackendMessageContent(
  blocks: MessageContentBlock[] | null | undefined,
  mentionResolutions?: MentionResolution[] | null,
): CaseMessageContent {
  const normalized = normalizeBackendRichTextContent(blocks, mentionResolutions);

  return {
    parts: normalized.parts.map((part): CaseInlinePart => {
      if (part.kind !== "mention") {
        return part;
      }

      return {
        ...part,
        resolvedUser: part.resolvedData ?? null,
      };
    }),
  };
}

export function toBackendMessageContent(
  appContent: CaseMessageContent,
): MessageContentBlock[] {
  return richTextToBackendBlocks(appContent);
}

export function toBackendPlainText(appContent: CaseMessageContent): string {
  return appContent.parts.map((part) => getReadableText(part)).join('');
}
