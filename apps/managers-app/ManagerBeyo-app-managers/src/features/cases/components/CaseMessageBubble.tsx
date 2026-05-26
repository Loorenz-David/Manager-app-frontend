import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { CaseConversationMessageRaw } from '../types';

type CaseMessageBubbleProps = {
  message: CaseConversationMessageRaw;
  isOwnMessage: boolean;
  children?: ReactNode;
};

function getMessageDisplayText(message: CaseConversationMessageRaw): string {
  if (message.plain_text.trim().length > 0) {
    return message.plain_text;
  }

  return (
    message.content
      ?.map((block) => block.text || block.label_value || block.link || '')
      .join('')
      .trim() ?? ''
  );
}

export function CaseMessageBubble({
  message,
  isOwnMessage,
  children,
}: CaseMessageBubbleProps): React.JSX.Element {
  const displayText = getMessageDisplayText(message);

  return (
    <div
      className={cn(
        'min-w-0 max-w-full select-none rounded-[1.5rem] px-4 py-3 text-sm shadow-sm [-webkit-touch-callout:none] [-webkit-user-select:none]',
        message.has_been_deleted && 'border border-dashed border-border shadow-none',
        isOwnMessage
          ? 'rounded-br-md bg-primary text-card'
          : 'rounded-bl-md bg-card text-foreground',
      )}
      data-testid={`case-message-bubble-${message.client_id}`}
    >
      {message.has_been_deleted ? (
        <p
          className={cn(
            'italic',
            isOwnMessage ? 'text-card/80' : 'text-muted-foreground',
          )}
          data-testid={`case-message-deleted-placeholder-${message.client_id}`}
        >
          Message deleted
        </p>
      ) : (
        children ?? <p className="whitespace-pre-wrap break-words leading-5">{displayText}</p>
      )}
    </div>
  );
}
