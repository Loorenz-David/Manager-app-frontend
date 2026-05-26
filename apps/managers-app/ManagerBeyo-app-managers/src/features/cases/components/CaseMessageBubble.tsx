import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { CaseMessageContent } from '../message-content';
import { fromBackendMessageContent } from '../lib/message-content-adapter';
import type { CaseConversationMessageRaw } from '../types';
import { CaseMessageBubbleContent } from './CaseMessageBubbleContent';

type CaseMessageBubbleProps = {
  message: CaseConversationMessageRaw;
  isOwnMessage: boolean;
  children?: ReactNode;
};

function getRenderableContent(message: CaseConversationMessageRaw): CaseMessageContent {
  const content = fromBackendMessageContent(message.content, message.mentions);

  if (content.parts.length > 0) {
    return content;
  }

  if (message.plain_text.trim().length > 0) {
    return {
      parts: [
        {
          kind: 'text',
          text: message.plain_text,
        },
      ],
    };
  }

  return { parts: [] };
}

export function CaseMessageBubble({
  message,
  isOwnMessage,
  children,
}: CaseMessageBubbleProps): React.JSX.Element {
  const content = getRenderableContent(message);

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
        children ?? <CaseMessageBubbleContent content={content} isOwnMessage={isOwnMessage} />
      )}
    </div>
  );
}
