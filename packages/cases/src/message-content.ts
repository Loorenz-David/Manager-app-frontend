import type { CaseUserSnapshot } from './types';

export type CaseInlinePartMarks = {
  bold?: boolean;
  underline?: boolean;
  size?: 'small' | 'base' | 'large';
  color?: string;
  animation?: string;
};

export type CaseMentionReference = {
  entityType: string;
  entityId: string;
  clientId: string;
};

export type CaseTextInlinePart = {
  kind: 'text';
  text: string;
  marks?: CaseInlinePartMarks;
};

export type CaseMentionInlinePart = {
  kind: 'mention';
  text: string;
  reference: CaseMentionReference;
  resolvedUser?: CaseUserSnapshot | null;
  marks?: CaseInlinePartMarks;
};

export type CaseLabelInlinePart = {
  kind: 'label';
  text: string;
  value: string;
  marks?: CaseInlinePartMarks;
};

export type CaseLinkInlinePart = {
  kind: 'link';
  text: string;
  href: string;
  marks?: CaseInlinePartMarks;
};

export type CaseInlinePart =
  | CaseTextInlinePart
  | CaseMentionInlinePart
  | CaseLabelInlinePart
  | CaseLinkInlinePart;

export type CaseMessageContent = {
  parts: CaseInlinePart[];
};
