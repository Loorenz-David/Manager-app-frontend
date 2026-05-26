import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CaseConversationMessageRawSchema } from '../types';
import { CaseMessageBubble } from './CaseMessageBubble';

describe('CaseMessageBubble', () => {
  it('renders backend content blocks through the adapter-backed renderer', () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: 'ccm_1',
      message_seq: 1,
      created_at: '2026-05-26T10:00:00+00:00',
      created_by: {
        client_id: 'usr_2',
        username: 'Alex',
        profile_picture: null,
      },
      content: [
        {
          type: 'text',
          text: 'See ',
          mention: null,
          label_value: null,
          link: null,
        },
        {
          type: 'mention',
          text: '@Jane Doe',
          mention: {
            mention_table: 'users',
            mention_id: 'user-1',
            client_id: 'usr_1',
          },
          label_value: null,
          link: null,
        },
        {
          type: 'text',
          text: ' ',
          mention: null,
          label_value: null,
          link: null,
        },
        {
          type: 'label',
          text: 'Urgent',
          mention: null,
          label_value: 'urgent',
          link: null,
        },
        {
          type: 'text',
          text: ' ',
          mention: null,
          label_value: null,
          link: null,
        },
        {
          type: 'link',
          text: 'Docs',
          mention: null,
          label_value: null,
          link: 'https://example.com/docs',
        },
      ],
      plain_text: 'See @Jane Doe Urgent Docs',
      has_been_edited: false,
      has_been_deleted: false,
      mentions: [
        {
          mention_table: 'users',
          mention_id: 'user-1',
          mention_data: {
            client_id: 'usr_1',
            username: 'Jane Doe',
            profile_picture: null,
          },
        },
      ],
    });

    render(<CaseMessageBubble isOwnMessage={false} message={message} />);

    expect(screen.getByText('@Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://example.com/docs',
    );
  });

  it('falls back to plain text when backend blocks are missing', () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: 'ccm_2',
      message_seq: 2,
      created_at: '2026-05-26T10:01:00+00:00',
      content: null,
      plain_text: 'Legacy plain-text message',
      has_been_edited: false,
      has_been_deleted: false,
    });

    render(<CaseMessageBubble isOwnMessage={true} message={message} />);

    expect(screen.getByText('Legacy plain-text message')).toBeInTheDocument();
  });

  it('preserves the deleted-message placeholder ahead of content rendering', () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: 'ccm_3',
      message_seq: 3,
      created_at: '2026-05-26T10:02:00+00:00',
      content: [
        {
          type: 'text',
          text: 'Should not render',
          mention: null,
          label_value: null,
          link: null,
        },
      ],
      plain_text: 'Should not render',
      has_been_edited: true,
      has_been_deleted: true,
    });

    render(<CaseMessageBubble isOwnMessage={false} message={message} />);

    expect(screen.getByText('Message deleted')).toBeInTheDocument();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });
});
