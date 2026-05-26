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

async function installMockAuth(page: Parameters<typeof test>[0]['page']) {
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

test.describe('cases page', () => {
  test('renders groups, filters client-side, shows unread badge, and opens the conversation slide', async ({
    page,
  }) => {
    const now = Date.now();
    const cases = [
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
            article_number: 'ART-NEW-001',
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
            article_number: 'ART-ACT-002',
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
            article_number: 'ART-RES-003',
            sku: 'SKU-RES-003',
            item_image: null,
          },
        },
      },
    ];

    await installMockAuth(page);

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
    await page.getByTestId('case-card-case_new_open').click();

    await expect(page.getByTestId('case-conversation-slide-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();
  });
});
