import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useImageQueryMock = vi.fn<
  (imageClientId: string | null | undefined) => { data: unknown }
>(() => ({ data: undefined }));

vi.mock('@/hooks/use-surface', () => ({
  useSurface: () => ({
    open: () => undefined,
  }),
}));

vi.mock('@/features/images/api/use-image', () => ({
  useImageQuery: (imageClientId: string | null | undefined) =>
    useImageQueryMock(imageClientId),
}));

import { CaseConversationMessageRawSchema } from '../types';
import { CaseMessageBubble } from './CaseMessageBubble';

describe('CaseMessageBubble', () => {
  beforeEach(() => {
    useImageQueryMock.mockReset();
    useImageQueryMock.mockReturnValue({ data: undefined });
  });

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

  it('renders message images inside the bubble when the backend returns attachments', () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: 'ccm_4',
      message_seq: 4,
      created_at: '2026-05-26T10:03:00+00:00',
      content: null,
      plain_text: '',
      has_been_edited: false,
      has_been_deleted: false,
      images: [
        {
          client_id: 'img_case_msg_1',
          image_url: 'https://cdn.example.com/case-message-1.webp',
          storage_provider: 's3',
          source_type: 'uploaded',
          width_px: 960,
          height_px: 960,
          file_size_bytes: 4096,
          created_at: '2026-05-26T10:03:00+00:00',
        },
      ],
    });

    render(<CaseMessageBubble isOwnMessage={false} message={message} />);

    expect(
      screen.getByTestId('case-message-image-grid-ccm_4'),
    ).toBeInTheDocument();
  });

  it('renders image annotations in the bubble preview from the initial case payload', () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: 'ccm_5',
      message_seq: 5,
      created_at: '2026-05-27T10:03:00+00:00',
      content: null,
      plain_text: '',
      has_been_edited: false,
      has_been_deleted: false,
      images: [
        {
          client_id: 'img_case_msg_2',
          image_url: 'https://cdn.example.com/case-message-2.webp',
          storage_provider: 's3',
          source_type: 'uploaded',
          width_px: null,
          height_px: null,
          file_size_bytes: 4096,
          created_at: '2026-05-27T10:03:00+00:00',
          image_annotation: {
            client_id: 'ann_case_msg_2',
            annotation_type: 'rectangle',
            data: {
              tool: 'rectangle',
              x: 0.1,
              y: 0.1,
              width: 0.3,
              height: 0.2,
              color: '#ff0000',
              strokeWidth: 4,
            },
            accuracy: null,
            created_at: '2026-05-27T10:03:00+00:00',
          },
        },
      ],
    });

    render(<CaseMessageBubble isOwnMessage={false} message={message} />);

    expect(
      screen.getByTestId(
        'case-message-image-annotation-ccm_5-img_case_msg_2',
      ),
    ).toBeVisible();
  });
});
