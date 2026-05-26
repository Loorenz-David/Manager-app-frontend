import { cn } from '@/lib/utils';

import type { CaseMessageRenderItem } from '../controllers/use-case-conversation-messages.controller';
import { CaseMessageDateSeparator } from './CaseMessageDateSeparator';
import { CaseMessageBubble } from './CaseMessageBubble';

type CaseMessageRowProps = {
  item: CaseMessageRenderItem;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatMessageTime(value: string): string {
  const createdAt = new Date(value);

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt);
}

export function CaseMessageRow({ item }: CaseMessageRowProps): React.JSX.Element {
  if (item.kind === 'date-separator') {
    return <CaseMessageDateSeparator label={item.label} separatorKey={item.key} />;
  }

  const { message, isOwnMessage } = item;
  const createdBy = message.created_by;

  return (
    <div
      className={cn(
        'flex w-full items-end gap-2 px-4 py-1.5',
        isOwnMessage ? 'justify-end' : 'justify-start',
      )}
      data-own-message={isOwnMessage ? 'true' : 'false'}
      data-testid={`case-message-row-${message.client_id}`}
    >
      {!isOwnMessage ? (
        <div
          className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-foreground"
          data-testid={`case-message-avatar-${message.client_id}`}
        >
          {createdBy?.profile_picture ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={createdBy.profile_picture}
            />
          ) : (
            <span>{getInitials(createdBy?.username ?? 'User')}</span>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          'flex max-w-[82%] min-w-0 flex-col gap-1',
          isOwnMessage ? 'items-end' : 'items-start',
        )}
      >
        {!isOwnMessage && createdBy?.username ? (
          <p className="px-1 text-[11px] font-medium text-muted-foreground">{createdBy.username}</p>
        ) : null}

        <CaseMessageBubble isOwnMessage={isOwnMessage} message={message} />

        <span className="px-1 text-[11px] text-muted-foreground">
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
