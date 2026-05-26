import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

import type { CaseMessageRenderItem } from '../controllers/use-case-conversation-messages.controller';
import { useCaseConversationContext } from '../providers/CaseConversationProvider';
import { CaseMessageDateSeparator } from './CaseMessageDateSeparator';
import { CaseMessageBubble } from './CaseMessageBubble';

const LONG_PRESS_MS = 500;

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
  const controller = useCaseConversationContext();
  const longPressTimerRef = useRef<number | null>(null);

  function clearLongPressTimer(): void {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  useEffect(() => clearLongPressTimer, []);

  if (item.kind === 'date-separator') {
    return <CaseMessageDateSeparator label={item.label} separatorKey={item.key} />;
  }

  const { message, isOwnMessage } = item;
  const createdBy = message.created_by;
  const canOpenActions = isOwnMessage && !message.has_been_deleted;

  function handlePointerDown(): void {
    if (!canOpenActions) {
      return;
    }

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      navigator.vibrate?.(10);
      controller.openMessageActions(message);
      longPressTimerRef.current = null;
    }, LONG_PRESS_MS);
  }

  function handlePointerUp(): void {
    clearLongPressTimer();
  }

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
          <p className="px-1 text-[11px] font-medium text-[color:var(--color-muted-intense)]">
            {createdBy.username}
          </p>
        ) : null}

        <div
          className={cn(
            'flex max-w-full items-end gap-2',
            isOwnMessage ? 'flex-row' : 'flex-row-reverse',
          )}
        >
          <div
            className={cn(canOpenActions && 'touch-none')}
            data-testid={canOpenActions ? `case-message-actions-trigger-${message.client_id}` : undefined}
            onContextMenu={
              canOpenActions
                ? (event) => {
                    event.preventDefault();
                  }
                : undefined
            }
            onPointerCancel={canOpenActions ? clearLongPressTimer : undefined}
            onPointerDown={canOpenActions ? handlePointerDown : undefined}
            onPointerLeave={canOpenActions ? clearLongPressTimer : undefined}
            onPointerUp={canOpenActions ? handlePointerUp : undefined}
          >
            <CaseMessageBubble isOwnMessage={isOwnMessage} message={message} />
          </div>
        </div>

        <div className="flex items-center gap-2 px-1 text-[11px] text-[color:var(--color-muted-intense)]">
          <span>{formatMessageTime(message.created_at)}</span>
          {message.has_been_edited && !message.has_been_deleted ? (
            <span data-testid={`case-message-edited-indicator-${message.client_id}`}>
              Edited
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
