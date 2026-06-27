import { z } from "zod";

export type RichTextInlinePartMarks = {
  bold?: boolean;
  underline?: boolean;
  size?: "small" | "base" | "large";
  color?: string;
  animation?: string;
};

export const BackendRichTextInlinePartMarksSchema = z.object({
  bold: z.boolean().optional(),
  underline: z.boolean().optional(),
  size: z.enum(["small", "base", "large"]).optional(),
  color: z.string().optional(),
  animation: z.string().optional(),
});

export const BackendRichTextMentionSchema = z.object({
  mention_table: z.string(),
  mention_id: z.string(),
  client_id: z.string(),
});

export const BackendRichTextBlockSchema = z.object({
  type: z.enum(["text", "mention", "label", "link"]),
  text: z.string(),
  mention: BackendRichTextMentionSchema.nullable().optional(),
  label_value: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  marks: BackendRichTextInlinePartMarksSchema.nullable().optional(),
});

export type RichTextMentionReference = {
  entityType: string;
  entityId: string;
  clientId: string;
};

export type RichTextTextInlinePart = {
  kind: "text";
  text: string;
  marks?: RichTextInlinePartMarks;
};

export type RichTextMentionInlinePart<TResolvedData = unknown> = {
  kind: "mention";
  text: string;
  reference: RichTextMentionReference;
  resolvedData?: TResolvedData | null;
  marks?: RichTextInlinePartMarks;
};

export type RichTextLabelInlinePart = {
  kind: "label";
  text: string;
  value: string;
  marks?: RichTextInlinePartMarks;
};

export type RichTextLinkInlinePart = {
  kind: "link";
  text: string;
  href: string;
  marks?: RichTextInlinePartMarks;
};

export type RichTextInlinePart<TResolvedData = unknown> =
  | RichTextTextInlinePart
  | RichTextMentionInlinePart<TResolvedData>
  | RichTextLabelInlinePart
  | RichTextLinkInlinePart;

export type RichTextContent<TResolvedData = unknown> = {
  parts: RichTextInlinePart<TResolvedData>[];
};

export type BackendRichTextMention = {
  mention_table: string;
  mention_id: string;
  client_id: string;
};

export type BackendRichTextBlock = {
  type: "text" | "mention" | "label" | "link";
  text: string;
  mention?: BackendRichTextMention | null;
  label_value?: string | null;
  link?: string | null;
  marks?: RichTextInlinePartMarks | null;
};

export type BackendMentionResolution<TResolvedData = unknown> = {
  mention_table: string;
  mention_id: string;
  mention_data: TResolvedData | null;
};

function getFallbackText(block: BackendRichTextBlock): string {
  return block.text || block.label_value || block.link || "";
}

function resolveMention<TResolvedData>(
  block: BackendRichTextBlock,
  mentionResolutions: BackendMentionResolution<TResolvedData>[] | null | undefined,
): BackendMentionResolution<TResolvedData> | null {
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

export function normalizeBackendRichTextContent<TResolvedData = unknown>(
  blocks: BackendRichTextBlock[] | null | undefined,
  mentionResolutions?: BackendMentionResolution<TResolvedData>[] | null,
): RichTextContent<TResolvedData> {
  if (!blocks || blocks.length === 0) {
    return { parts: [] };
  }

  return {
    parts: blocks.map((block): RichTextInlinePart<TResolvedData> => {
      const text = getFallbackText(block);
      const marks = block.marks ?? undefined;

      if (block.type === "mention" && block.mention) {
        const resolution = resolveMention(block, mentionResolutions);

        return {
          kind: "mention",
          text,
          marks,
          reference: {
            entityType: block.mention.mention_table,
            entityId: block.mention.mention_id,
            clientId: block.mention.client_id,
          },
          resolvedData: resolution?.mention_data ?? null,
        };
      }

      if (block.type === "label" && block.label_value) {
        return {
          kind: "label",
          text,
          marks,
          value: block.label_value,
        };
      }

      if (block.type === "link" && block.link) {
        return {
          kind: "link",
          text,
          marks,
          href: block.link,
        };
      }

      return {
        kind: "text",
        text,
        marks,
      };
    }),
  };
}

export function richTextToBackendBlocks(content: RichTextContent): BackendRichTextBlock[] {
  return content.parts.map((part): BackendRichTextBlock => {
    const marks = part.marks ?? null;

    if (part.kind === "mention") {
      return {
        type: "mention",
        text: part.text,
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

    if (part.kind === "label") {
      return {
        type: "label",
        text: part.text,
        mention: null,
        label_value: part.value,
        link: null,
        marks,
      };
    }

    if (part.kind === "link") {
      return {
        type: "link",
        text: part.text,
        mention: null,
        label_value: null,
        link: part.href,
        marks,
      };
    }

    return { type: "text", text: part.text, mention: null, label_value: null, link: null, marks };
  });
}
