import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/app-fixture';

const DAY_MS = 86_400_000;

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

function createCasesList(now: number) {
  return [
    {
      client_id: 'case_new_open',
      created_at: new Date(now - 60 * 60 * 1000).toISOString(),
      state: 'open',
      case_type_id: 'type_damage',
      type_label: 'Damage',
      participant_count: 2,
      messages_count: 4,
      created_by: {
        client_id: 'usr_1',
        username: 'Alice Mason',
        profile_picture: null,
      },
      entity_type: 'task',
      last_message_seq: 4,
      task: {
        client_id: 'task_1',
        state: 'pending',
        return_source: 'after_purchase',
        task_type: 'return',
        ready_by_at: null,
        item: {
          client_id: 'item_1',
          article_number: 'CARD-NEW-001',
          sku: 'SKU-NEW-001',
          item_image: null,
        },
      },
    },
    {
      client_id: 'case_active_open',
      created_at: new Date(now - 3 * DAY_MS).toISOString(),
      state: 'open',
      case_type_id: 'type_delivery',
      type_label: 'Delivery delay',
      participant_count: 3,
      messages_count: 2,
      created_by: {
        client_id: 'usr_2',
        username: 'Bob Stone',
        profile_picture: null,
      },
      entity_type: 'task',
      last_message_seq: 2,
      task: {
        client_id: 'task_2',
        state: 'working',
        return_source: 'store_return',
        task_type: 'internal',
        ready_by_at: null,
        item: {
          client_id: 'item_2',
          article_number: 'CARD-ACT-002',
          sku: 'SKU-ACT-002',
          item_image: null,
        },
      },
    },
    {
      client_id: 'case_resolving',
      created_at: new Date(now - 10 * DAY_MS).toISOString(),
      state: 'resolving',
      case_type_id: 'type_upholstery',
      type_label: 'Upholstery fix',
      participant_count: 4,
      messages_count: 6,
      created_by: {
        client_id: 'usr_3',
        username: 'Carla Reed',
        profile_picture: null,
      },
      entity_type: 'task',
      last_message_seq: 6,
      task: {
        client_id: 'task_3',
        state: 'ready',
        return_source: 'before_purchase',
        task_type: 'pre_order',
        ready_by_at: null,
        item: {
          client_id: 'item_3',
          article_number: 'CARD-RES-003',
          sku: 'SKU-RES-003',
          item_image: null,
        },
      },
    },
  ];
}

function createCaseDetail(caseClientId: string, state: 'open' | 'resolving' | 'resolved', typeLabel: string) {
  return {
    case: {
      client_id: caseClientId,
      state,
      type_label: typeLabel,
      participants_count: 2,
      conversations_count: 1,
      messages_count: 4,
      created_at: '2026-05-26T07:00:00Z',
      created_by_id: 'usr_1',
      conversation_client_id: `ccv_${caseClientId}`,
      conversation_messages_count: 4,
      conversation_last_message_seq: 4,
      conversation_created_at: '2026-05-26T07:00:00Z',
      mentions: [],
    },
    case_conversation_messages: [],
    messages_pagination: {
      limit: 10,
      has_more: false,
      next_before_message_seq: null,
    },
  };
}

function createTaskDetail(
  taskId: string,
  articleNumber: string,
  taskType: 'return' | 'pre_order' | 'internal',
  returnSource: 'after_purchase' | 'before_purchase' | 'store_return',
  options?: {
    imageUrl?: string | null;
    state?: 'pending' | 'assigned' | 'working' | 'stalled' | 'ready' | 'resolved' | 'failed' | 'cancelled';
  },
) {
  return {
    task: {
      client_id: taskId,
      task_scalar_id: 1,
      task_type: taskType,
      priority: 'normal',
      state: options?.state ?? 'pending',
      title: null,
      summary: null,
      return_source: returnSource,
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
      client_id: `item_${taskId}`,
      article_number: articleNumber,
      sku: `${articleNumber}-SKU`,
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
    item_images: options?.imageUrl
      ? [
          {
            client_id: `img_${taskId}`,
            image_url: options.imageUrl,
            width_px: 1200,
            height_px: 1200,
            file_size_bytes: 32_000,
          },
        ]
      : [],
    item_issues: [],
    item_upholstery: [],
    requirements: [],
    task_steps: [],
    task_notes: [],
    unread_message_count: 0,
  };
}

async function installCasesMocks(
  page: Page,
  options?: {
    onStatePatch?: (payload: { caseId: string; body: unknown }) => void;
  },
) {
  const now = Date.now();
  const cases = createCasesList(now);
  const caseDetails = {
    case_new_open: createCaseDetail('case_new_open', 'open', 'Damage'),
    case_active_open: createCaseDetail('case_active_open', 'open', 'Delivery delay'),
    case_resolving: createCaseDetail('case_resolving', 'resolving', 'Upholstery fix'),
  };
  const caseLinks = {
    case_new_open: [
      {
        client_id: 'clk_case_new_open',
        entity_type: 'task',
        entity_client_id: 'task_1',
        role: 'subject',
        created_at: '2026-05-26T07:00:00Z',
      },
    ],
    case_active_open: [
      {
        client_id: 'clk_case_active_open',
        entity_type: 'task',
        entity_client_id: 'task_2',
        role: 'subject',
        created_at: '2026-05-26T07:00:00Z',
      },
    ],
    case_resolving: [
      {
        client_id: 'clk_case_resolving',
        entity_type: 'task',
        entity_client_id: 'task_3',
        role: 'subject',
        created_at: '2026-05-26T07:00:00Z',
      },
    ],
  };
  const taskDetails = {
    task_1: createTaskDetail('task_1', 'ART-DETAIL-001', 'return', 'after_purchase', {
      imageUrl: 'https://example.com/task-1.jpg',
      state: 'assigned',
    }),
    task_2: createTaskDetail('task_2', 'ART-DETAIL-002', 'internal', 'store_return'),
    task_3: createTaskDetail('task_3', 'ART-DETAIL-003', 'pre_order', 'before_purchase'),
  };

  await page.route('**/api/v1/cases/*/links', async (route) => {
    const caseId = new URL(route.request().url()).pathname.split('/').at(-2) as keyof typeof caseLinks;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          links: caseLinks[caseId] ?? [],
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/*/state', async (route) => {
    const caseId = new URL(route.request().url()).pathname.split('/').at(-2) as keyof typeof caseDetails;
    const body = route.request().postDataJSON();

    options?.onStatePatch?.({
      caseId,
      body,
    });

    if (
      body &&
      typeof body === 'object' &&
      'new_state' in body &&
      typeof body.new_state === 'string'
    ) {
      caseDetails[caseId].case.state = body.new_state as 'open' | 'resolving' | 'resolved';
      const listItem = cases.find((item) => item.client_id === caseId);
      if (listItem) {
        listItem.state = body.new_state as 'open' | 'resolving' | 'resolved';
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          case: caseDetails[caseId].case,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/*', async (route) => {
    const caseId = new URL(route.request().url()).pathname.split('/').at(-1) as keyof typeof caseDetails;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: caseDetails[caseId],
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
          case_unread_counts: {
            case_new_open: 3,
            case_active_open: 0,
            case_resolving: 1,
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/tasks/*', async (route) => {
    const taskId = new URL(route.request().url()).pathname.split('/').at(-1) as keyof typeof taskDetails;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: taskDetails[taskId],
      }),
    });
  });
}

async function openCase(page: Page, caseId: string) {
  await page.getByTestId(`case-card-${caseId}`).click();
  await expect(page.getByTestId('case-conversation-slide')).toBeVisible();
}

test.describe('cases page', () => {
  test('renders groups, filters client-side, shows unread badge, and opens the conversation shell', async ({
    page,
  }) => {
    await installMockAuth(page);
    await installCasesMocks(page);

    await page.goto('/cases');

    await expect(page.getByTestId('cases-page')).toBeVisible();
    await expect(page.getByTestId('cases-section-new').getByTestId('case-card-case_new_open')).toBeVisible();
    await expect(
      page.getByTestId('cases-section-active').getByTestId('case-card-case_active_open'),
    ).toBeVisible();
    await expect(
      page.getByTestId('cases-section-resolving').getByTestId('case-card-case_resolving'),
    ).toBeVisible();

    await expect(page.getByTestId('cases-section-active').getByTestId('case-card-case_new_open')).toHaveCount(0);
    await expect(page.getByTestId('case-card-unread-case_new_open')).toHaveText('3');

    await page.getByTestId('cases-search-bar-input').fill('bob');
    await expect(
      page.getByTestId('cases-section-active').getByTestId('case-card-case_active_open'),
    ).toBeVisible();
    await expect(page.getByTestId('case-card-case_new_open')).toHaveCount(0);
    await expect(page.getByTestId('case-card-case_resolving')).toHaveCount(0);

    await page.getByTestId('cases-search-bar-input').fill('');
    await openCase(page, 'case_new_open');

    await expect(page.getByTestId('case-conversation-header')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Conversation' })).toHaveCount(0);
    await expect(page.getByTestId('case-conversation-primary-label')).toHaveText('ART-DETAIL-001');
    await expect(page.getByTestId('case-conversation-subtitle')).toHaveText('Return • After purchase');
    await expect(page.getByTestId('case-conversation-info-button')).toBeEnabled();
    await expect(page.getByTestId('case-conversation-state-button')).toHaveText('Process');
  });

  test('back button closes the conversation slide', async ({ page }) => {
    await installMockAuth(page);
    await installCasesMocks(page);

    await page.goto('/cases');
    await openCase(page, 'case_new_open');

    await page.getByTestId('case-conversation-back-button').click();
    await expect(page.getByTestId('case-conversation-slide')).not.toBeVisible();
  });

  test('info button opens the task info sheet and the task detail slide', async ({ page }) => {
    await installMockAuth(page);
    await installCasesMocks(page);

    await page.goto('/cases');
    await openCase(page, 'case_new_open');

    await page.getByTestId('case-conversation-info-button').click();

    await expect(page.getByTestId('case-task-info-sheet')).toBeVisible();
    await expect(page.getByTestId('case-task-info-card')).toBeVisible();
    await expect(page.getByTestId('case-task-info-image')).toBeVisible();
    await expect(page.getByTestId('case-task-info-state')).toContainText('Assigned');
    await expect(page.getByTestId('case-task-info-card')).toContainText('ART-DETAIL-001');
    await expect(page.getByTestId('case-task-info-card')).toContainText('Return');
    await expect(page.getByTestId('case-task-info-card')).toContainText('After purchase');

    await page.getByTestId('case-task-info-card').click();

    await expect(page.getByTestId('task-detail-slide')).toBeVisible();
    await expect(page.getByTestId('case-task-info-sheet')).not.toBeVisible();
    await expect(page.getByTestId('case-conversation-slide')).toBeVisible();

    const taskDetailFollowsConversation = await page.evaluate(() => {
      const conversation = document.querySelector('[data-testid="case-conversation-slide"]');
      const taskDetail = document.querySelector('[data-testid="task-detail-slide"]');

      if (!conversation || !taskDetail) {
        return false;
      }

      return Boolean(
        conversation.compareDocumentPosition(taskDetail) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    expect(taskDetailFollowsConversation).toBe(true);
  });

  test('state button maps backend transitions and closes the slide on success', async ({
    page,
  }) => {
    const unexpectedResponses: string[] = [];
    const stateTransitions: Array<{ caseId: string; body: unknown }> = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/v1/') && response.status() >= 400) {
        unexpectedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await installMockAuth(page);
    await installCasesMocks(page, {
      onStatePatch: (payload) => {
        stateTransitions.push(payload);
      },
    });

    await page.goto('/cases');

    await openCase(page, 'case_new_open');
    await expect(page.getByTestId('case-conversation-state-button')).toHaveText('Process');
    await page.getByTestId('case-conversation-state-button').click();
    await expect(page.getByTestId('case-conversation-slide')).not.toBeVisible();

    await openCase(page, 'case_resolving');
    await expect(page.getByTestId('case-conversation-primary-label')).toHaveText('ART-DETAIL-003');
    await expect(page.getByTestId('case-conversation-subtitle')).toHaveText('Pre-order • Before purchase');
    await expect(page.getByTestId('case-conversation-state-button')).toHaveText('Resolve');
    await page.getByTestId('case-conversation-state-button').click();
    await expect(page.getByTestId('case-conversation-slide')).not.toBeVisible();

    expect(stateTransitions).toEqual([
      {
        caseId: 'case_new_open',
        body: {
          case_client_id: 'case_new_open',
          new_state: 'resolving',
        },
      },
      {
        caseId: 'case_resolving',
        body: {
          case_client_id: 'case_resolving',
          new_state: 'resolved',
        },
      },
    ]);

    expect(unexpectedResponses).toEqual([]);
  });
});
