import type {
  RichTextInlinePartMarks,
  RichTextLabelInlinePart,
  RichTextLinkInlinePart,
  RichTextMentionInlinePart,
  RichTextMentionReference,
  RichTextTextInlinePart,
} from "@beyo/lib";

import type { CaseUserSnapshot } from './types';

export type CaseInlinePartMarks = RichTextInlinePartMarks;
export type CaseMentionReference = RichTextMentionReference;
export type CaseTextInlinePart = RichTextTextInlinePart;
export type CaseMentionInlinePart = RichTextMentionInlinePart<CaseUserSnapshot> & {
  resolvedUser?: CaseUserSnapshot | null;
};
export type CaseLabelInlinePart = RichTextLabelInlinePart;
export type CaseLinkInlinePart = RichTextLinkInlinePart;
export type CaseInlinePart =
  | CaseTextInlinePart
  | CaseMentionInlinePart
  | CaseLabelInlinePart
  | CaseLinkInlinePart;
export type CaseMessageContent = {
  parts: CaseInlinePart[];
};
