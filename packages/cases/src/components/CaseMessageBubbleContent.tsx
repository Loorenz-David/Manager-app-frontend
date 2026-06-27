import { RichTextContentView } from '@beyo/lib';

import type { CaseMessageContent } from '../message-content';

type CaseMessageBubbleContentProps = {
  content: CaseMessageContent;
  isOwnMessage: boolean;
  isNew: boolean;
};

export function CaseMessageBubbleContent({
  content,
  isOwnMessage,
  isNew,
}: CaseMessageBubbleContentProps): React.JSX.Element {
  return (
    <p className="whitespace-pre-wrap wrap-break-word leading-5">
      <RichTextContentView
        classNames={{
          mention: isOwnMessage ? 'bg-card/20 text-card' : 'bg-muted text-foreground',
          label: isOwnMessage
            ? 'border-card/30 bg-card/15 text-card'
            : 'border-border bg-muted/70 text-foreground',
          link: isOwnMessage ? 'text-card' : 'text-primary',
        }}
        content={content}
        enableAnimations={isNew}
      />
    </p>
  );
}
