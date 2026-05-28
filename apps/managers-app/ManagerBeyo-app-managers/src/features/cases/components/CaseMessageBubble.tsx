import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { CaseMessageContent } from '../message-content';
import { fromBackendMessageContent } from '../lib/message-content-adapter';
import type { CaseConversationMessageRaw } from '../types';
import { CaseMessageBubbleContent } from './CaseMessageBubbleContent';
import { CaseMessageImageGrid } from './CaseMessageImageGrid';

type CaseMessageBubbleProps = {
  message: CaseConversationMessageRaw;
  isOwnMessage: boolean;
  isNew: boolean;
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
  isNew,
  children,
}: CaseMessageBubbleProps): React.JSX.Element {
  const content = getRenderableContent(message);
  const hasTextContent = content.parts.length > 0;
  const hasImages = (message.images?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        'min-w-0 max-w-full select-none rounded-[1.5rem] text-sm shadow-sm [-webkit-touch-callout:none] [-webkit-user-select:none]',
        hasTextContent || message.has_been_deleted ? 'px-4 py-3' : 'px-2 py-2',
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
        children ?? (
          <>
            {hasTextContent ? (
              <CaseMessageBubbleContent content={content} isNew={isNew} isOwnMessage={isOwnMessage} />
            ) : null}
            {hasImages ? <CaseMessageImageGrid message={message} /> : null}
          </>
        )
      )}
    </div>
  );
}
