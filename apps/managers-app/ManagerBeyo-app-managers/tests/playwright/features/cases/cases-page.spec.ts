import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/app-fixture';

const DAY_MS = 86_400_000;
const LONG_THREAD_NOTE = '\nInspection note captured.\nWarehouse follow-up logged.';

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
  const totalMessagesCount = 4;

  return {
    case: {
      client_id: caseClientId,
      state,
      type_label: typeLabel,
      participants_count: 2,
      conversations_count: 1,
      messages_count: totalMessagesCount,
      created_at: '2026-05-26T07:00:00Z',
      created_by_id: 'usr_1',
      conversation_client_id: `ccv_${caseClientId}`,
      conversation_messages_count: totalMessagesCount,
      conversation_last_message_seq: totalMessagesCount,
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

function createCaseMessage(params: {
  caseId: string;
  sequence: number;
  createdAt: string;
  createdById: string;
  createdByName: string;
  profilePicture?: string | null;
  text: string;
  deleted?: boolean;
}) {
  return {
    case_id: params.caseId,
    client_id: `ccm_${params.caseId}_${params.sequence}`,
    message_seq: params.sequence,
    created_at: params.createdAt,
    created_by: {
      client_id: params.createdById,
      username: params.createdByName,
      profile_picture: params.profilePicture ?? null,
    },
    content: params.deleted
      ? null
      : [
          {
            type: 'text',
            text: params.text,
            mention: null,
            label_value: null,
            link: null,
          },
        ],
    plain_text: params.deleted ? '' : params.text,
    has_been_edited: false,
    has_been_deleted: Boolean(params.deleted),
    updated_at: null,
    images: [],
    mentions: [],
  };
}

function createPaginatedCaseDetail(
  caseClientId: string,
  state: 'open' | 'resolving' | 'resolved',
  typeLabel: string,
  messages: ReturnType<typeof createCaseMessage>[],
  options: {
    totalMessagesCount: number;
    lastMessageSeq: number;
    hasMore: boolean;
    nextBeforeMessageSeq: number | null;
  },
) {
  return {
    case: {
      client_id: caseClientId,
      state,
      type_label: typeLabel,
      participants_count: 2,
      conversations_count: 1,
      messages_count: options.totalMessagesCount,
      created_at: '2026-05-26T07:00:00Z',
      created_by_id: 'usr_1',
      conversation_client_id: `ccv_${caseClientId}`,
      conversation_messages_count: options.totalMessagesCount,
      conversation_last_message_seq: options.lastMessageSeq,
      conversation_created_at: '2026-05-26T07:00:00Z',
      mentions: [],
    },
    case_conversation_messages: messages,
    messages_pagination: {
      limit: 10,
      has_more: options.hasMore,
      next_before_message_seq: options.nextBeforeMessageSeq,
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
    onCaseDetailRequest?: (payload: {
      caseId: string;
      beforeMessageSeq: number | null;
      url: string;
    }) => void;
    onMarkReadRequest?: (payload: {
      body: {
        case_participant_client_id: string;
        up_to_message_seq: number;
      };
    }) => void;
    olderPageResponseDelayMs?: number;
  },
) {
  const now = Date.now();
  const cases = createCasesList(now);
  const unreadCounts: Record<string, number> = {
    case_new_open: 3,
    case_active_open: 0,
    case_resolving: 1,
  };
  const caseNewOpenLatestMessages = [
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 6,
      createdAt: '2026-05-25T12:00:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: `Customer called again about the damaged return.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 7,
      createdAt: '2026-05-25T12:06:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: `I am checking the task notes and item photos now.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 8,
      createdAt: '2026-05-25T12:12:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: `The outer box is torn and the chair leg has visible scratches.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 9,
      createdAt: '2026-05-25T12:18:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: 'Temporary note',
      deleted: true,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 10,
      createdAt: '2026-05-25T12:24:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: `I uploaded close-up photos to the linked task a moment ago.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 11,
      createdAt: '2026-05-26T11:00:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: `Thanks. We can already separate inspection from final resolution.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 12,
      createdAt: '2026-05-26T11:07:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: `Perfect, I will keep the item in quarantine until the team confirms next steps.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 13,
      createdAt: '2026-05-26T11:14:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: `Good. Keep the customer updated that we are processing the damage report today.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 14,
      createdAt: '2026-05-26T11:19:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: `I also noted the serial sticker condition and added a second warehouse photo for traceability.${LONG_THREAD_NOTE}`,
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 15,
      createdAt: '2026-05-26T11:26:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: `Perfect. That is enough context for the team to review the case without reopening the intake.${LONG_THREAD_NOTE}`,
    }),
  ];
  const caseNewOpenOlderMessages = [
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 1,
      createdAt: '2026-05-24T13:00:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: 'Opening a damage case for the return delivery.',
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 2,
      createdAt: '2026-05-24T13:08:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: 'Received. Please collect the first photo set and task article details.',
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 3,
      createdAt: '2026-05-24T13:14:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: 'The article is ART-DETAIL-001 and the packaging also looks compromised.',
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 4,
      createdAt: '2026-05-24T13:21:00Z',
      createdById: 'usr_manager',
      createdByName: 'Manager',
      text: 'Document the visible issues before the customer leaves the counter.',
    }),
    createCaseMessage({
      caseId: 'case_new_open',
      sequence: 5,
      createdAt: '2026-05-24T13:27:00Z',
      createdById: 'usr_2',
      createdByName: 'Bob Stone',
      profilePicture: 'https://example.com/bob.png',
      text: 'Understood, I have started the intake checklist.',
    }),
  ];
  const caseDetails = {
    case_new_open: {
      initial: createPaginatedCaseDetail(
        'case_new_open',
        'open',
        'Damage',
        caseNewOpenLatestMessages,
        {
          totalMessagesCount: 15,
          lastMessageSeq: 15,
          hasMore: true,
          nextBeforeMessageSeq: 6,
        },
      ),
      older_6: createPaginatedCaseDetail(
        'case_new_open',
        'open',
        'Damage',
        caseNewOpenOlderMessages,
        {
          totalMessagesCount: 15,
          lastMessageSeq: 15,
          hasMore: false,
          nextBeforeMessageSeq: null,
        },
      ),
    },
    case_active_open: {
      initial: createPaginatedCaseDetail(
        'case_active_open',
        'open',
        'Delivery delay',
        [
          createCaseMessage({
            caseId: 'case_active_open',
            sequence: 1,
            createdAt: '2026-05-26T09:00:00Z',
            createdById: 'usr_2',
            createdByName: 'Bob Stone',
            text: 'Customer is asking about the delayed delivery window.',
          }),
          createCaseMessage({
            caseId: 'case_active_open',
            sequence: 2,
            createdAt: '2026-05-26T09:07:00Z',
            createdById: 'usr_manager',
            createdByName: 'Manager',
            text: 'Keep them informed until dispatch confirms the updated ETA.',
          }),
        ],
        {
          totalMessagesCount: 2,
          lastMessageSeq: 2,
          hasMore: false,
          nextBeforeMessageSeq: null,
        },
      ),
    },
    case_resolving: {
      initial: createPaginatedCaseDetail(
        'case_resolving',
        'resolving',
        'Upholstery fix',
        [
          createCaseMessage({
            caseId: 'case_resolving',
            sequence: 1,
            createdAt: '2026-05-23T10:00:00Z',
            createdById: 'usr_3',
            createdByName: 'Carla Reed',
            text: 'The upholstery repair is in its final review stage.',
          }),
          createCaseMessage({
            caseId: 'case_resolving',
            sequence: 2,
            createdAt: '2026-05-23T10:12:00Z',
            createdById: 'usr_manager',
            createdByName: 'Manager',
            text: 'Once QA signs off, we can move this case to resolved.',
          }),
          createCaseMessage({
            caseId: 'case_resolving',
            sequence: 3,
            createdAt: '2026-05-24T10:25:00Z',
            createdById: 'usr_3',
            createdByName: 'Carla Reed',
            text: 'QA requested one more photo of the stitched seam.',
          }),
          createCaseMessage({
            caseId: 'case_resolving',
            sequence: 4,
            createdAt: '2026-05-24T10:33:00Z',
            createdById: 'usr_manager',
            createdByName: 'Manager',
            text: 'Send it and then we can close the loop.',
          }),
        ],
        {
          totalMessagesCount: 4,
          lastMessageSeq: 4,
          hasMore: false,
          nextBeforeMessageSeq: null,
        },
      ),
    },
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
  const caseParticipants = {
    case_new_open: [
      {
        client_id: 'cpt_case_new_open_manager',
        user_id: 'usr_manager',
        last_read_message_seq: 12,
        joined_at: '2026-05-26T07:00:00Z',
      },
      {
        client_id: 'cpt_case_new_open_bob',
        user_id: 'usr_2',
        last_read_message_seq: 15,
        joined_at: '2026-05-26T07:00:00Z',
      },
    ],
    case_active_open: [
      {
        client_id: 'cpt_case_active_open_manager',
        user_id: 'usr_manager',
        last_read_message_seq: 2,
        joined_at: '2026-05-26T07:00:00Z',
      },
      {
        client_id: 'cpt_case_active_open_bob',
        user_id: 'usr_2',
        last_read_message_seq: 2,
        joined_at: '2026-05-26T07:00:00Z',
      },
    ],
    case_resolving: [
      {
        client_id: 'cpt_case_resolving_manager',
        user_id: 'usr_manager',
        last_read_message_seq: 3,
        joined_at: '2026-05-26T07:00:00Z',
      },
      {
        client_id: 'cpt_case_resolving_carla',
        user_id: 'usr_3',
        last_read_message_seq: 4,
        joined_at: '2026-05-26T07:00:00Z',
      },
    ],
  };
  const participantToCaseId = Object.fromEntries(
    Object.entries(caseParticipants).flatMap(([caseId, participants]) =>
      participants.map((participant) => [participant.client_id, caseId]),
    ),
  );

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
      caseDetails[caseId].initial.case.state = body.new_state as 'open' | 'resolving' | 'resolved';

      if ('older_6' in caseDetails[caseId]) {
        caseDetails[caseId].older_6.case.state = body.new_state as
          | 'open'
          | 'resolving'
          | 'resolved';
      }

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
          case: caseDetails[caseId].initial.case,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/*/participants', async (route) => {
    const caseId = new URL(route.request().url()).pathname.split('/').at(-2) as keyof typeof caseParticipants;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          participants: caseParticipants[caseId] ?? [],
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/messages/mark-read', async (route) => {
    const body = route.request().postDataJSON() as {
      case_participant_client_id: string;
      up_to_message_seq: number;
    };
    const caseId = participantToCaseId[body.case_participant_client_id] as keyof typeof caseDetails;
    const participants = caseParticipants[caseId] ?? [];
    const participant = participants.find(
      (entry) => entry.client_id === body.case_participant_client_id,
    );

    options?.onMarkReadRequest?.({ body });

    if (participant) {
      participant.last_read_message_seq = Math.max(
        participant.last_read_message_seq,
        body.up_to_message_seq,
      );

      unreadCounts[caseId] = Math.max(
        0,
        (caseDetails[caseId].initial.case.conversation_last_message_seq ?? 0) -
          participant.last_read_message_seq,
      );
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          last_read_message_seq: participant?.last_read_message_seq ?? body.up_to_message_seq,
        },
      }),
    });
  });

  await page.route('**/api/v1/cases/*', async (route) => {
    const url = new URL(route.request().url());
    const caseId = url.pathname.split('/').at(-1) as keyof typeof caseDetails;
    const beforeMessageSeqParam = url.searchParams.get('before_message_seq');
    const beforeMessageSeq = beforeMessageSeqParam ? Number(beforeMessageSeqParam) : null;

    options?.onCaseDetailRequest?.({
      caseId,
      beforeMessageSeq,
      url: route.request().url(),
    });

    if (beforeMessageSeq && options?.olderPageResponseDelayMs) {
      await page.waitForTimeout(options.olderPageResponseDelayMs);
    }

    const detailPage =
      beforeMessageSeq === 6 && 'older_6' in caseDetails[caseId]
        ? caseDetails[caseId].older_6
        : caseDetails[caseId].initial;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: detailPage,
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
    await expect(page.getByTestId('case-conversation-context-banner')).toBeVisible();
    await expect(page.getByTestId('case-message-list')).toBeVisible();
    await expect(page.getByTestId('case-message-row-ccm_case_new_open_13')).toBeVisible();
    await expect(page.getByTestId('case-conversation-context-banner')).toHaveAttribute(
      'data-collapsed',
      'false',
    );
    await expect(page.getByRole('heading', { name: 'Conversation' })).toHaveCount(0);
    await expect(page.getByTestId('case-conversation-primary-label')).toHaveText('ART-DETAIL-001');
    await expect(page.getByTestId('case-conversation-subtitle')).toHaveText('Return • After purchase');
    await expect(page.getByTestId('case-conversation-info-button')).toBeEnabled();
    await expect(page.getByTestId('case-conversation-state-button')).toHaveText('Process');
  });

  test('renders message separators, own and other bubbles, avatars, and deleted placeholders', async ({
    page,
  }) => {
    await installMockAuth(page);
    await installCasesMocks(page);

    await page.goto('/cases');
    await openCase(page, 'case_new_open');

    await expect(page.getByTestId('case-message-date-separator-2026-05-26')).toBeVisible();
    await page.getByTestId('case-conversation-scroll-container').evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(page.getByTestId('case-message-date-separator-2026-05-25')).toBeVisible();
    await expect(page.getByTestId('case-message-row-ccm_case_new_open_7')).toHaveAttribute(
      'data-own-message',
      'true',
    );
    await expect(page.getByTestId('case-message-row-ccm_case_new_open_8')).toHaveAttribute(
      'data-own-message',
      'false',
    );
    await expect(page.getByTestId('case-message-avatar-ccm_case_new_open_8')).toBeVisible();
    await expect(
      page.getByTestId('case-message-deleted-placeholder-ccm_case_new_open_9'),
    ).toBeVisible();
  });

  test('scrolling to the top loads older messages and preserves the visible anchor', async ({
    page,
  }) => {
    const detailRequests: Array<{ caseId: string; beforeMessageSeq: number | null; url: string }> = [];

    await installMockAuth(page);
    await installCasesMocks(page, {
      onCaseDetailRequest: (payload) => {
        detailRequests.push(payload);
      },
      olderPageResponseDelayMs: 250,
    });

    await page.goto('/cases');
    await openCase(page, 'case_new_open');

    const scrollContainer = page.getByTestId('case-conversation-scroll-container');
    const anchor = page.getByTestId('case-message-row-ccm_case_new_open_8');

    await scrollContainer.evaluate((element) => {
      element.scrollTop = 4;
    });

    await expect(anchor).toHaveCount(1);
    const anchorBefore = await anchor.evaluate((element) => element.getBoundingClientRect().top);

    await scrollContainer.evaluate((element) => {
      element.scrollTop = 0;
    });

    await expect(page.getByTestId('case-message-row-ccm_case_new_open_2')).toBeVisible({
      timeout: 1500,
    });

    await expect(anchor).toHaveCount(1);
    const anchorAfter = await anchor.evaluate((element) => element.getBoundingClientRect().top);

    expect(detailRequests.some((request) => request.caseId === 'case_new_open')).toBe(true);
    expect(
      detailRequests.some(
        (request) =>
          request.caseId === 'case_new_open' && request.beforeMessageSeq === 6,
      ),
    ).toBe(true);

    expect(Math.abs(anchorAfter - anchorBefore)).toBeLessThan(100);
  });

  test('context banner collapses on upward scroll and restores on downward scroll', async ({
    page,
  }) => {
    await installMockAuth(page);
    await installCasesMocks(page);

    await page.goto('/cases');
    await openCase(page, 'case_new_open');

    const header = page.getByTestId('case-conversation-header');
    const banner = page.getByTestId('case-conversation-context-banner');
    const scrollContainer = page.getByTestId('case-conversation-scroll-container');
    await expect(banner).toHaveAttribute('data-collapsed', 'false');

    await scrollContainer.evaluate((element) => {
      element.scrollTop = 0;
    });

    await expect(banner).toHaveAttribute('data-collapsed', 'true', { timeout: 1000 });
    await expect(header).toBeVisible();

    await scrollContainer.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(banner).toHaveAttribute('data-collapsed', 'false', { timeout: 1000 });
    await expect(header).toBeVisible();
  });

  test('back button closes the conversation slide', async ({ page }) => {
    await installMockAuth(page);
    await installCasesMocks(page);

    await page.goto('/cases');
    await openCase(page, 'case_new_open');

    await page.getByTestId('case-conversation-back-button').click();
    await expect(page.getByTestId('case-conversation-slide')).not.toBeVisible();
  });

  test('opening a conversation marks the latest visible message as read and clears the cases unread badge without duplicate calls', async ({
    page,
  }) => {
    const markReadRequests: Array<{
      case_participant_client_id: string;
      up_to_message_seq: number;
    }> = [];

    await installMockAuth(page);
    await installCasesMocks(page, {
      onMarkReadRequest: ({ body }) => {
        markReadRequests.push(body);
      },
    });

    await page.goto('/cases');
    await expect(page.getByTestId('case-card-unread-case_new_open')).toHaveText('3');

    await openCase(page, 'case_new_open');

    await expect.poll(() => markReadRequests).toEqual([
      {
        case_participant_client_id: 'cpt_case_new_open_manager',
        up_to_message_seq: 15,
      },
    ]);

    const scrollContainer = page.getByTestId('case-conversation-scroll-container');

    await scrollContainer.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(page.getByTestId('case-message-row-ccm_case_new_open_6')).toBeVisible();

    await scrollContainer.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await page.waitForTimeout(250);
    await expect(markReadRequests).toHaveLength(1);

    await page.getByTestId('case-conversation-back-button').click();
    await expect(page.getByTestId('case-conversation-slide')).not.toBeVisible();
    await expect(page.getByTestId('case-card-unread-case_new_open')).toHaveCount(0);
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
