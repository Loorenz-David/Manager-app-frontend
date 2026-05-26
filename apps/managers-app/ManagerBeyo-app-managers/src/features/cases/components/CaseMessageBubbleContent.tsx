import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import type { CaseInlinePart, CaseInlinePartMarks, CaseMessageContent } from '../message-content';

type CaseMessageBubbleContentProps = {
  content: CaseMessageContent;
  isOwnMessage: boolean;
};

function getTextClassName(marks: CaseInlinePartMarks | undefined): string {
  return cn(
    marks?.bold && 'font-semibold',
    marks?.underline && 'underline underline-offset-2',
    marks?.size === 'small' && 'text-xs',
    marks?.size === 'large' && 'text-base',
  );
}

function getTextStyle(marks: CaseInlinePartMarks | undefined): CSSProperties | undefined {
  if (!marks?.color) {
    return undefined;
  }

  return {
    color: marks.color,
  };
}

function renderInlinePart(
  part: CaseInlinePart,
  index: number,
  isOwnMessage: boolean,
): React.JSX.Element {
  const key = `${part.kind}-${index}`;
  const commonProps = {
    className: getTextClassName(part.marks),
    'data-animation': part.marks?.animation,
    style: getTextStyle(part.marks),
  };

  if (part.kind === 'mention') {
    return (
      <span
        key={key}
        {...commonProps}
        className={cn(
          'inline-flex rounded-full px-2 py-0.5 align-baseline text-[0.95em] font-medium',
          isOwnMessage ? 'bg-card/20 text-card' : 'bg-muted text-foreground',
          commonProps.className,
        )}
      >
        {part.text}
      </span>
    );
  }

  if (part.kind === 'label') {
    return (
      <span
        key={key}
        {...commonProps}
        className={cn(
          'inline-flex rounded-full border px-2 py-0.5 align-baseline text-[0.8em] font-semibold uppercase tracking-[0.08em]',
          isOwnMessage
            ? 'border-card/30 bg-card/15 text-card'
            : 'border-border bg-muted/70 text-foreground',
          commonProps.className,
        )}
      >
        {part.text || part.value}
      </span>
    );
  }

  if (part.kind === 'link') {
    return (
      <a
        key={key}
        {...commonProps}
        className={cn(
          'underline decoration-current underline-offset-2',
          isOwnMessage ? 'text-card' : 'text-primary',
          commonProps.className,
        )}
        href={part.href}
        rel="noreferrer"
        target="_blank"
      >
        {part.text || part.href}
      </a>
    );
  }

  return (
    <span key={key} {...commonProps}>
      {part.text}
    </span>
  );
}

export function CaseMessageBubbleContent({
  content,
  isOwnMessage,
}: CaseMessageBubbleContentProps): React.JSX.Element {
  return (
    <p className="whitespace-pre-wrap break-words leading-5">
      {content.parts.map((part, index) => renderInlinePart(part, index, isOwnMessage))}
    </p>
  );
}
