import type {
  CaseInlinePart,
  CaseMessageContent,
} from '../message-content';
import type { MentionResolution, MessageContentBlock } from '../types';

function getFallbackText(block: MessageContentBlock): string {
  return block.text || block.label_value || block.link || '';
}

function toTextBlock(text: string): MessageContentBlock {
  return {
    type: 'text',
    text,
    mention: null,
    label_value: null,
    link: null,
  };
}

function getReadableText(part: CaseInlinePart): string {
  if (part.kind === 'label') {
    return part.text || part.value;
  }

  if (part.kind === 'link') {
    return part.text || part.href;
  }

  return part.text;
}

function resolveMention(
  block: MessageContentBlock,
  mentionResolutions: MentionResolution[] | null | undefined,
): MentionResolution | null {
  if (!block.mention) {
    return null;
  }

  return (
    mentionResolutions?.find(
      (resolution) =>
        resolution.mention_table === block.mention?.mention_table &&
        resolution.mention_id === block.mention?.mention_id,
    ) ?? null
  );
}

export function fromBackendMessageContent(
  blocks: MessageContentBlock[] | null | undefined,
  mentionResolutions?: MentionResolution[] | null,
): CaseMessageContent {
  if (!blocks || blocks.length === 0) {
    return { parts: [] };
  }

  return {
    parts: blocks.map((block): CaseInlinePart => {
      const text = getFallbackText(block);

      const marks = block.marks ?? undefined;

      if (block.type === 'mention' && block.mention) {
        const resolution = resolveMention(block, mentionResolutions);

        return {
          kind: 'mention',
          text,
          marks,
          reference: {
            entityType: block.mention.mention_table,
            entityId: block.mention.mention_id,
            clientId: block.mention.client_id,
          },
          resolvedUser: resolution?.mention_data ?? null,
        };
      }

      if (block.type === 'label' && block.label_value) {
        return {
          kind: 'label',
          text,
          marks,
          value: block.label_value,
        };
      }

      if (block.type === 'link' && block.link) {
        return {
          kind: 'link',
          text,
          marks,
          href: block.link,
        };
      }

      return {
        kind: 'text',
        text,
        marks,
      };
    }),
  };
}

export function toBackendMessageContent(
  appContent: CaseMessageContent,
): MessageContentBlock[] {
  return appContent.parts.map((part) => {
    const readableText = getReadableText(part);
    const marks = part.marks ?? null;

    if (part.kind === 'mention') {
      return {
        type: 'mention',
        text: readableText,
        mention: {
          mention_table: part.reference.entityType,
          mention_id: part.reference.entityId,
          client_id: part.reference.clientId,
        },
        label_value: null,
        link: null,
        marks,
      };
    }

    if (part.kind === 'label') {
      return {
        type: 'label',
        text: readableText,
        mention: null,
        label_value: part.value,
        link: null,
        marks,
      };
    }

    if (part.kind === 'link') {
      return {
        type: 'link',
        text: readableText,
        mention: null,
        label_value: null,
        link: part.href,
        marks,
      };
    }

    return { ...toTextBlock(readableText), marks };
  });
}

export function toBackendPlainText(appContent: CaseMessageContent): string {
  return appContent.parts.map((part) => getReadableText(part)).join('');
}
