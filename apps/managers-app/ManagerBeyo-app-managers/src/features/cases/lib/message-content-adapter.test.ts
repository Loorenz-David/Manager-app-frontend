import { describe, expect, it } from 'vitest';

import type { CaseMessageContent } from '../message-content';
import {
  MentionResolutionSchema,
  MessageContentBlockSchema,
} from '../types';
import {
  fromBackendMessageContent,
  toBackendMessageContent,
  toBackendPlainText,
} from './message-content-adapter';

describe('message content adapter', () => {
  it('adapts backend blocks into app-owned content with mention resolution', () => {
    const blocks = [
      MessageContentBlockSchema.parse({
        type: 'text',
        text: 'Hello ',
        mention: null,
        label_value: null,
        link: null,
      }),
      MessageContentBlockSchema.parse({
        type: 'mention',
        text: '@Jane Doe',
        mention: {
          mention_table: 'users',
          mention_id: 'user-1',
          client_id: 'usr_1',
        },
        label_value: null,
        link: null,
      }),
      MessageContentBlockSchema.parse({
        type: 'label',
        text: 'Urgent',
        mention: null,
        label_value: 'urgent',
        link: null,
      }),
      MessageContentBlockSchema.parse({
        type: 'link',
        text: 'Docs',
        mention: null,
        label_value: null,
        link: 'https://example.com/docs',
      }),
    ];
    const mentionResolutions = [
      MentionResolutionSchema.parse({
        mention_table: 'users',
        mention_id: 'user-1',
        mention_data: {
          client_id: 'usr_1',
          username: 'Jane Doe',
          profile_picture: null,
        },
      }),
    ];

    expect(fromBackendMessageContent(blocks, mentionResolutions)).toEqual({
      parts: [
        {
          kind: 'text',
          text: 'Hello ',
        },
        {
          kind: 'mention',
          text: '@Jane Doe',
          reference: {
            entityType: 'users',
            entityId: 'user-1',
            clientId: 'usr_1',
          },
          resolvedUser: {
            client_id: 'usr_1',
            username: 'Jane Doe',
            profile_picture: null,
          },
        },
        {
          kind: 'label',
          text: 'Urgent',
          value: 'urgent',
        },
        {
          kind: 'link',
          text: 'Docs',
          href: 'https://example.com/docs',
        },
      ],
    });
  });

  it('serializes supported content kinds back into backend-compatible blocks', () => {
    const content: CaseMessageContent = {
      parts: [
        {
          kind: 'text',
          text: 'Hello ',
        },
        {
          kind: 'mention',
          text: '@Jane Doe',
          reference: {
            entityType: 'users',
            entityId: 'user-1',
            clientId: 'usr_1',
          },
        },
        {
          kind: 'label',
          text: 'Urgent',
          value: 'urgent',
        },
        {
          kind: 'link',
          text: 'Docs',
          href: 'https://example.com/docs',
        },
      ],
    };

    expect(toBackendMessageContent(content)).toEqual([
      {
        type: 'text',
        text: 'Hello ',
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
        type: 'label',
        text: 'Urgent',
        mention: null,
        label_value: 'urgent',
        link: null,
      },
      {
        type: 'link',
        text: 'Docs',
        mention: null,
        label_value: null,
        link: 'https://example.com/docs',
      },
    ]);
  });

  it('degrades future-only marks to plain backend text blocks', () => {
    const content: CaseMessageContent = {
      parts: [
        {
          kind: 'mention',
          text: '@Jane Doe',
          reference: {
            entityType: 'users',
            entityId: 'user-1',
            clientId: 'usr_1',
          },
          marks: {
            bold: true,
            color: '#ff6600',
          },
        },
      ],
    };

    expect(toBackendMessageContent(content)).toEqual([
      {
        type: 'text',
        text: '@Jane Doe',
        mention: null,
        label_value: null,
        link: null,
      },
    ]);
  });

  it('builds backend plain text from readable inline text', () => {
    const content: CaseMessageContent = {
      parts: [
        {
          kind: 'text',
          text: 'Hello ',
        },
        {
          kind: 'mention',
          text: '@Jane Doe',
          reference: {
            entityType: 'users',
            entityId: 'user-1',
            clientId: 'usr_1',
          },
        },
        {
          kind: 'text',
          text: ' - ',
        },
        {
          kind: 'link',
          text: 'Docs',
          href: 'https://example.com/docs',
        },
      ],
    };

    expect(toBackendPlainText(content)).toBe('Hello @Jane Doe - Docs');
  });
});
