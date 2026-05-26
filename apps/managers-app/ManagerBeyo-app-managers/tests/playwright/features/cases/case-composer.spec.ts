import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/app-fixture';

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function createAccessToken(): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = encodeBase64Url(
    JSON.stringify({
      user_id: 'usr_manager',
      username: 'Manager',
      workspace_id: 'ws_1',
      role_name: 'manager',
      backend_permissions: [],
      ui: {
        apps: ['admin'],
        pages: ['cases', 'tasks', 'home', 'stats', 'settings'],
        buttons: [],
        actions: [],
        query_filters: [],
      },
    }),
  );

  return `${header}.${payload}.signature`;
}

async function installMockAuth(page: Page) {
  const accessToken = createAccessToken();

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          access_token: accessToken,
        },
      }),
    });
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          user: {
            client_id: 'usr_manager',
            email: 'manager@example.com',
            username: 'Manager',
          },
        },
      }),
    });
  });
}

async function installVibrationMock(page: Page) {
  await page.addInitScript(() => {
    const calls: Array<number | number[]> = [];

    Object.defineProperty(window, '__caseComposerVibrateCalls', {
      configurable: true,
      value: calls,
      writable: true,
    });

    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        calls.push(pattern);
        return true;
      },
    });
  });
}

function createCaseMessage(params: {
  caseId: string;
  sequence: number;
  createdAt: string;
  createdById: string;
  createdByName: string;
  text: string;
}) {
  return {
    case_id: params.caseId,
    client_id: `ccm_${params.caseId}_${params.sequence}`,
    message_seq: params.sequence,
    created_at: params.createdAt,
    created_by: {
      client_id: params.createdById,
      username: params.createdByName,
      profile_picture: null,
    },
    content: [
      {
        type: 'text',
        text: params.text,
        mention: null,
        label_value: null,
        link: null,
      },
    ],
    plain_text: params.text,
    has_been_edited: false,
    has_been_deleted: false,
    updated_at: null,
    images: [],
    mentions: [],
  };
}

function createCaseDetail(caseClientId: string, messages: ReturnType<typeof createCaseMessage>[]) {
  const lastMessageSeq = messages.at(-1)?.message_seq ?? null;

  return {
    case: {
      client_id: caseClientId,
      state: 'open',
      type_label: 'Damage',
      participants_count: 2,
      conversations_count: 1,
      messages_count: messages.length,
      created_at: '2026-05-26T07:00:00Z',
      created_by_id: 'usr_support',
      conversation_client_id: `ccv_${caseClientId}`,
      conversation_messages_count: messages.length,
      conversation_last_message_seq: lastMessageSeq,
      conversation_created_at: '2026-05-26T07:00:00Z',
      mentions: [],
    },
    case_conversation_messages: messages,
    messages_pagination: {
      limit: 10,
      has_more: false,
      next_before_message_seq: null,
    },
  };
}

function createTaskDetail() {
  return {
    task: {
      client_id: 'task_composer',
      task_scalar_id: 1,
      task_type: 'return',
      priority: 'normal',
      state: 'assigned',
      title: null,
      summary: null,
      return_source: 'after_purchase',
      item_location: null,
      return_method: null,
      fulfillment_method: null,
      additional_details: null,
      ready_by_at: null,
      scheduled_start_at: null,
      scheduled_end_at: null,
      customer_id: null,
      primary_phone_number: null,
      secondary_phone_number: null,
      primary_email: null,
      secondary_email: null,
      address: null,
      created_at: '2026-05-26T07:00:00Z',
      updated_at: null,
      closed_at: null,
      is_deleted: false,
      deleted_at: null,
    },
    item: {
      client_id: 'item_composer',
      article_number: 'ART-COMPOSER-001',
      sku: 'SKU-COMPOSER-001',
      state: 'pending',
      item_category_id: null,
      quantity: 1,
      designer: null,
      height_in_cm: null,
      width_in_cm: null,
      depth_in_cm: null,
      item_value_minor: null,
      item_cost_minor: null,
      item_currency: null,
      item_position: null,
      external_id: null,
      external_url: null,
      external_source: null,
      external_order_id: null,
      item_category_snapshot: null,
      item_major_category_snapshot: null,
    },
    item_images: [],
    item_issues: [],
    item_upholstery: [],
    requirements: [],
    task_steps: [],
    task_notes: [],
    unread_message_count: 0,
  };
}

async function installComposerMocks(
  page: Page,
  options?: {
    failuresBeforeSuccess?: number;
    onMarkReadRequest?: (body: {
      case_participant_client_id: string;
      up_to_message_seq: number;
    }) => void;
    onEditRequest?: (body: {
      message_client_id: string;
      plain_text: string;
      content: Array<{
        type: string;
        text: string;
        mention: null;
        label_value: null;
        link: null;
      }>;
    }) => void;
    onDeleteRequest?: (messageClientId: string) => void;
    onSendRequest?: (body: {
      client_id: string;
      conversation_client_id: string;
      plain_text: string;
      content: Array<{
        type: string;
        text: string;
        mention: null;
        label_value: null;
        link: null;
      }>;
    }) => void;
  },
) {
  const caseId = 'case_composer';
  const conversationClientId = `ccv_${caseId}`;
  const cases = [
    {
      client_id: caseId,
      created_at: '2026-05-26T10:00:00Z',
      state: 'open',
      case_type_id: 'type_damage',
      type_label: 'Damage',
      participant_count: 2,
      messages_count: 3,
      created_by: {
        client_id: 'usr_support',
        username: 'Support',
        profile_picture: null,
      },
      entity_type: 'task',
      last_message_seq: 3,
      task: {
        client_id: 'task_composer',
        state: 'assigned',
        return_source: 'after_purchase',
        task_type: 'return',
        ready_by_at: null,
        item: {
          client_id: 'item_composer',
          article_number: 'ART-COMPOSER-001',
          sku: 'SKU-COMPOSER-001',
          item_image: null,
        },
      },
    },
  ];
  const messages = [
    createCaseMessage({
      caseId,
      sequence: 1,
      createdAt: '2026-05-26T09:00:00Z',
      createdById: 'usr_support',
      createdByName: 'Support',
      text: 'Can you confirm the packaging condition?',
    }),
    createCaseMessage({
      caseId,
      sequence: 2,
      createdAt: '2026-05-26T09:05:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: 'I am checking the warehouse notes now.',
    }),
    createCaseMessage({
      caseId,
      sequence: 3,
      createdAt: '2026-05-26T09:09:00Z',
      createdById: 'usr_support',
      createdByName: 'Support',
      text: 'Thanks, we need one plain-text update for the customer file.',
    }),
  ];
  const participants = [
    {
      client_id: 'cpt_case_composer_manager',
      user_id: 'usr_manager',
      last_read_message_seq: 3,
      joined_at: '2026-05-26T07:00:00Z',
    },
    {
      client_id: 'cpt_case_composer_support',
      user_id: 'usr_support',
      last_read_message_seq: 3,
      joined_at: '2026-05-26T07:00:00Z',
    },
  ];
  const unreadCounts: Record<string, number> = {
    [caseId]: 0,
  };
  let sendAttempts = 0;

  await installVibrationMock(page);
  await installMockAuth(page);

  await page.route('**/api/v1/cases/*/links', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          links: [
            {
              client_id: 'clk_case_composer',
              entity_type: 'task',
              entity_client_id: 'task_composer',
              role: 'subject',
              created_at: '2026-05-26T07:00:00Z',
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/*/participants', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          participants,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/messages/*', async (route) => {
    const method = route.request().method();
    const messageClientId = route.request().url().split('/').at(-1) ?? '';

    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as {
        message_client_id: string;
        plain_text: string;
        content: Array<{
          type: string;
          text: string;
          mention: null;
          label_value: null;
          link: null;
        }>;
      };
      const message = messages.find((entry) => entry.client_id === messageClientId);

      options?.onEditRequest?.(body);

      if (!message) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: 'Message not found.',
          }),
        });
        return;
      }

      message.plain_text = body.plain_text;
      message.content = body.content;
      message.has_been_edited = true;
      message.updated_at = '2026-05-26T09:12:00Z';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            message,
          },
        }),
      });
      return;
    }

    if (method === 'DELETE') {
      const message = messages.find((entry) => entry.client_id === messageClientId);

      options?.onDeleteRequest?.(messageClientId);

      if (!message) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            error: 'Message not found.',
          }),
        });
        return;
      }

      message.has_been_deleted = true;
      message.plain_text = '';
      message.content = [];
      message.updated_at = '2026-05-26T09:13:00Z';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            deleted: true,
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: 'Method not allowed.',
      }),
    });
  });

  await page.route('**/api/v1/cases/messages/mark-read', async (route) => {
    const body = route.request().postDataJSON() as {
      case_participant_client_id: string;
      up_to_message_seq: number;
    };

    options?.onMarkReadRequest?.(body);
    participants[0].last_read_message_seq = Math.max(
      participants[0].last_read_message_seq,
      body.up_to_message_seq,
    );
    unreadCounts[caseId] = 0;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          last_read_message_seq: participants[0].last_read_message_seq,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/conversations/*/messages', async (route) => {
    sendAttempts += 1;
    const body = route.request().postDataJSON() as {
      client_id: string;
      conversation_client_id: string;
      plain_text: string;
      content: Array<{
        type: string;
        text: string;
        mention: null;
        label_value: null;
        link: null;
      }>;
    };

    options?.onSendRequest?.(body);

    if (sendAttempts <= (options?.failuresBeforeSuccess ?? 0)) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'Message send failed.',
        }),
      });
      return;
    }

    const createdMessage = {
      case_id: caseId,
      client_id: body.client_id,
      message_seq: messages.length + 1,
      created_at: '2026-05-26T09:15:00Z',
      created_by: {
        client_id: 'usr_manager',
        username: 'Manager',
        profile_picture: null,
      },
      content: body.content,
      plain_text: body.plain_text,
      has_been_edited: false,
      has_been_deleted: false,
      updated_at: null,
      images: [],
      mentions: [],
    };

    messages.push(createdMessage);
    cases[0].messages_count = messages.length;
    cases[0].last_message_seq = createdMessage.message_seq;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          message: createdMessage,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (
      route.request().method() !== 'GET' ||
      !/^\/api\/v1\/cases\/[^/]+$/.test(requestUrl.pathname)
    ) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: createCaseDetail(caseId, messages),
      }),
    });
  });

  await page.route('**/api/v1/cases?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          cases,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/unread-counts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          case_unread_counts: unreadCounts,
        },
      }),
    });
  });

  await page.route('**/api/v1/tasks/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: createTaskDetail(),
      }),
    });
  });
}

async function openCase(page: Page) {
  await page.goto('/cases');
  await page.getByTestId('case-card-case_composer').click();
  await expect(page.getByTestId('case-conversation-slide')).toBeVisible();
}

async function longPressOwnMessage(page: Page, messageClientId: string) {
  const target = page.getByTestId(`case-message-actions-trigger-${messageClientId}`);

  await target.dispatchEvent('pointerdown', { pointerType: 'touch' });
  await page.waitForTimeout(600);
  await target.dispatchEvent('pointerup', { pointerType: 'touch' });
}

test.describe('case composer', () => {
  test('keeps send disabled for empty and whitespace-only drafts', async ({ page }) => {
    await installComposerMocks(page);
    await openCase(page);

    const sendButton = page.getByTestId('case-composer-send-button');
    const textarea = page.getByTestId('case-composer-textarea');

    await expect(page.getByTestId('case-composer')).toBeVisible();
    await expect(sendButton).toBeDisabled();

    await textarea.fill('   ');
    await expect(sendButton).toBeDisabled();
  });

  test('typing enables send', async ({ page }) => {
    await installComposerMocks(page);
    await openCase(page);

    const sendButton = page.getByTestId('case-composer-send-button');

    await page.getByTestId('case-composer-textarea').fill('Plain text update');
    await expect(sendButton).toBeEnabled();
  });

  test('sending posts one text block, shows the new message, clears the draft, and keeps the last row above the composer', async ({
    page,
  }) => {
    const sendRequests: Array<{
      client_id: string;
      conversation_client_id: string;
      plain_text: string;
      content: Array<{
        type: string;
        text: string;
        mention: null;
        label_value: null;
        link: null;
      }>;
    }> = [];
    const markReadRequests: Array<{
      case_participant_client_id: string;
      up_to_message_seq: number;
    }> = [];

    await installComposerMocks(page, {
      onMarkReadRequest: (body) => {
        markReadRequests.push(body);
      },
      onSendRequest: (body) => {
        sendRequests.push(body);
      },
    });
    await openCase(page);

    await page.getByTestId('case-composer-textarea').fill('  Warehouse update is ready.  ');
    await page.getByTestId('case-composer-send-button').click();

    await expect.poll(() => sendRequests.length).toBe(1);
    expect(sendRequests[0]?.conversation_client_id).toBe('ccv_case_composer');
    expect(sendRequests[0]?.plain_text).toBe('Warehouse update is ready.');
    expect(sendRequests[0]?.content).toEqual([
      {
        type: 'text',
        text: 'Warehouse update is ready.',
        mention: null,
        label_value: null,
        link: null,
      },
    ]);
    expect(sendRequests[0]?.client_id).toMatch(/^ccm_/);

    await expect(page.getByText('Warehouse update is ready.')).toBeVisible();
    await expect(page.getByTestId('case-composer-textarea')).toHaveValue('');
    await expect
      .poll(() => markReadRequests.at(-1)?.up_to_message_seq ?? null)
      .toBe(4);

    const composerBox = await page.getByTestId('case-composer').boundingBox();
    const lastMessageBox = await page
      .getByTestId(`case-message-row-${sendRequests[0]?.client_id}`)
      .boundingBox();

    expect(composerBox).not.toBeNull();
    expect(lastMessageBox).not.toBeNull();
    expect((lastMessageBox?.y ?? 0) + (lastMessageBox?.height ?? 0)).toBeLessThanOrEqual(
      (composerBox?.y ?? 0) + 2,
    );
  });

  test('failed send keeps the draft recoverable and exposes a retry path', async ({ page }) => {
    await installComposerMocks(page, { failuresBeforeSuccess: 1 });
    await openCase(page);

    const textarea = page.getByTestId('case-composer-textarea');

    await textarea.fill('Retry this draft');
    await page.getByTestId('case-composer-send-button').click();

    await expect(page.getByTestId('case-composer-error')).toBeVisible();
    await expect(page.getByTestId('case-composer-error')).toContainText('Message send failed.');
    await expect(textarea).toHaveValue('Retry this draft');

    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByText('Retry this draft')).toBeVisible();
    await expect(textarea).toHaveValue('');
    await expect(page.getByTestId('case-composer-error')).toHaveCount(0);
  });

  test('own messages open the action sheet', async ({ page }) => {
    await installComposerMocks(page);
    await openCase(page);

    await expect(page.getByTestId('case-message-actions-trigger-ccm_case_composer_2')).toBeVisible();
    await expect(page.getByTestId('case-message-actions-trigger-ccm_case_composer_1')).toHaveCount(0);

    await longPressOwnMessage(page, 'ccm_case_composer_2');

    await expect(page.getByTestId('case-message-actions-sheet')).toBeVisible();
    await expect(page.getByTestId('case-message-edit-button')).toBeVisible();
    await expect(page.getByTestId('case-message-delete-button')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as typeof window & {
        __caseComposerVibrateCalls?: Array<number | number[]>;
      }).__caseComposerVibrateCalls?.length ?? 0))
      .toBe(1);
  });

  test('editing updates the rendered bubble, shows the edited indicator, and preserves the send draft', async ({
    page,
  }) => {
    const editRequests: Array<{
      message_client_id: string;
      plain_text: string;
      content: Array<{
        type: string;
        text: string;
        mention: null;
        label_value: null;
        link: null;
      }>;
    }> = [];

    await installComposerMocks(page, {
      onEditRequest: (body) => {
        editRequests.push(body);
      },
    });
    await openCase(page);

    await page.getByTestId('case-composer-textarea').fill('Draft to keep');
    await longPressOwnMessage(page, 'ccm_case_composer_2');
    await page.getByTestId('case-message-edit-button').click();

    const textarea = page.getByTestId('case-composer-textarea');
    await expect(page.getByTestId('case-composer-edit-mode')).toBeVisible();
    await expect(textarea).toHaveValue('I am checking the warehouse notes now.');

    await textarea.fill('  Updated warehouse note for the customer file.  ');
    await page.getByTestId('case-composer-save-button').click();

    await expect.poll(() => editRequests.length).toBe(1);
    expect(editRequests[0]).toEqual({
      message_client_id: 'ccm_case_composer_2',
      plain_text: 'Updated warehouse note for the customer file.',
      content: [
        {
          type: 'text',
          text: 'Updated warehouse note for the customer file.',
          mention: null,
          label_value: null,
          link: null,
        },
      ],
    });

    await expect(
      page.getByTestId('case-message-bubble-ccm_case_composer_2'),
    ).toContainText('Updated warehouse note for the customer file.');
    await expect(page.getByTestId('case-message-edited-indicator-ccm_case_composer_2')).toBeVisible();
    await expect(textarea).toHaveValue('Draft to keep');
  });

  test('soft delete replaces the message content with the deleted placeholder', async ({ page }) => {
    const deleteRequests: string[] = [];

    await installComposerMocks(page, {
      onDeleteRequest: (messageClientId) => {
        deleteRequests.push(messageClientId);
      },
    });
    await openCase(page);

    await longPressOwnMessage(page, 'ccm_case_composer_2');
    await page.getByTestId('case-message-delete-button').click();
    await page.getByTestId('case-message-delete-button').click();

    await expect.poll(() => deleteRequests).toEqual(['ccm_case_composer_2']);
    await expect(
      page.getByTestId('case-message-deleted-placeholder-ccm_case_composer_2'),
    ).toBeVisible();
    await expect(page.getByTestId('case-message-row-ccm_case_composer_2')).toBeVisible();
  });
});
