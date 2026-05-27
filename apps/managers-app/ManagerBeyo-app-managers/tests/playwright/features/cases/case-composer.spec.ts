import type { Page } from "@playwright/test";

import { expect, test } from "../../fixtures/app-fixture";

const CASE_COMPOSER_MODE_STORAGE_KEY = "managerbeyo.cases.composerMode";

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function createAccessToken(): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      user_id: "usr_manager",
      username: "Manager",
      workspace_id: "ws_1",
      role_name: "manager",
      backend_permissions: [],
      ui: {
        apps: ["admin"],
        pages: ["cases", "tasks", "home", "stats", "settings"],
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

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          access_token: accessToken,
        },
      }),
    });
  });

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          user: {
            client_id: "usr_manager",
            email: "manager@example.com",
            username: "Manager",
          },
        },
      }),
    });
  });
}

async function installVibrationMock(page: Page) {
  await page.addInitScript(() => {
    const calls: Array<number | number[]> = [];

    Object.defineProperty(window, "__caseComposerVibrateCalls", {
      configurable: true,
      value: calls,
      writable: true,
    });

    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: number | number[]) => {
        calls.push(pattern);
        return true;
      },
    });
  });
}

async function setCaseComposerMode(page: Page, mode: "basic" | "rich") {
  await page.addInitScript(
    ([storageKey, nextMode]) => {
      window.localStorage.setItem(storageKey, nextMode);
    },
    [CASE_COMPOSER_MODE_STORAGE_KEY, mode] as const,
  );
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
        type: "text",
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

function createCaseDetail(
  caseClientId: string,
  messages: ReturnType<typeof createCaseMessage>[],
) {
  const lastMessageSeq = messages.at(-1)?.message_seq ?? null;

  return {
    case: {
      client_id: caseClientId,
      state: "open",
      type_label: "Damage",
      participants_count: 2,
      conversations_count: 1,
      messages_count: messages.length,
      created_at: "2026-05-26T07:00:00Z",
      created_by_id: "usr_support",
      conversation_client_id: `ccv_${caseClientId}`,
      conversation_messages_count: messages.length,
      conversation_last_message_seq: lastMessageSeq,
      conversation_created_at: "2026-05-26T07:00:00Z",
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
      client_id: "task_composer",
      task_scalar_id: 1,
      task_type: "return",
      priority: "normal",
      state: "assigned",
      title: null,
      summary: null,
      return_source: "after_purchase",
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
      created_at: "2026-05-26T07:00:00Z",
      updated_at: null,
      closed_at: null,
      is_deleted: false,
      deleted_at: null,
    },
    item: {
      client_id: "item_composer",
      article_number: "ART-COMPOSER-001",
      sku: "SKU-COMPOSER-001",
      state: "pending",
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
  const caseId = "case_composer";
  const conversationClientId = `ccv_${caseId}`;
  const cases = [
    {
      client_id: caseId,
      created_at: "2026-05-26T10:00:00Z",
      state: "open",
      case_type_id: "type_damage",
      type_label: "Damage",
      participant_count: 2,
      messages_count: 3,
      created_by: {
        client_id: "usr_support",
        username: "Support",
        profile_picture: null,
      },
      entity_type: "task",
      last_message_seq: 3,
      task: {
        client_id: "task_composer",
        state: "assigned",
        return_source: "after_purchase",
        task_type: "return",
        ready_by_at: null,
        item: {
          client_id: "item_composer",
          article_number: "ART-COMPOSER-001",
          sku: "SKU-COMPOSER-001",
          item_image: null,
        },
      },
    },
  ];
  const messages = [
    createCaseMessage({
      caseId,
      sequence: 1,
      createdAt: "2026-05-26T09:00:00Z",
      createdById: "usr_support",
      createdByName: "Support",
      text: "Can you confirm the packaging condition?",
    }),
    createCaseMessage({
      caseId,
      sequence: 2,
      createdAt: "2026-05-26T09:05:00Z",
      createdById: "usr_manager",
      createdByName: "Manager",
      text: "I am checking the warehouse notes now.",
    }),
    createCaseMessage({
      caseId,
      sequence: 3,
      createdAt: "2026-05-26T09:09:00Z",
      createdById: "usr_support",
      createdByName: "Support",
      text: "Thanks, we need one plain-text update for the customer file.",
    }),
  ];
  const participants = [
    {
      client_id: "cpt_case_composer_manager",
      user_id: "usr_manager",
      last_read_message_seq: 3,
      joined_at: "2026-05-26T07:00:00Z",
    },
    {
      client_id: "cpt_case_composer_support",
      user_id: "usr_support",
      last_read_message_seq: 3,
      joined_at: "2026-05-26T07:00:00Z",
    },
  ];
  const unreadCounts: Record<string, number> = {
    [caseId]: 0,
  };
  let sendAttempts = 0;

  await installVibrationMock(page);
  await installMockAuth(page);

  await page.route("**/api/v1/cases/*/links", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          links: [
            {
              client_id: "clk_case_composer",
              entity_type: "task",
              entity_client_id: "task_composer",
              role: "subject",
              created_at: "2026-05-26T07:00:00Z",
            },
          ],
        },
      }),
    });
  });

  await page.route("**/api/v1/cases/*/participants", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          participants,
        },
      }),
    });
  });

  await page.route("**/api/v1/cases/messages/*", async (route) => {
    const method = route.request().method();
    const messageClientId = route.request().url().split("/").at(-1) ?? "";

    if (method === "PATCH") {
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
      const message = messages.find(
        (entry) => entry.client_id === messageClientId,
      );

      options?.onEditRequest?.(body);

      if (!message) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Message not found.",
          }),
        });
        return;
      }

      message.plain_text = body.plain_text;
      message.content = body.content;
      message.has_been_edited = true;
      message.updated_at = "2026-05-26T09:12:00Z";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
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

    if (method === "DELETE") {
      const message = messages.find(
        (entry) => entry.client_id === messageClientId,
      );

      options?.onDeleteRequest?.(messageClientId);

      if (!message) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Message not found.",
          }),
        });
        return;
      }

      message.has_been_deleted = true;
      message.plain_text = "";
      message.content = [];
      message.updated_at = "2026-05-26T09:13:00Z";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
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
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Method not allowed.",
      }),
    });
  });

  await page.route("**/api/v1/cases/messages/mark-read", async (route) => {
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
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          last_read_message_seq: participants[0].last_read_message_seq,
        },
      }),
    });
  });

  await page.route(
    "**/api/v1/cases/conversations/*/messages",
    async (route) => {
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
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "Message send failed.",
          }),
        });
        return;
      }

      const createdMessage = {
        case_id: caseId,
        client_id: body.client_id,
        message_seq: messages.length + 1,
        created_at: "2026-05-26T09:15:00Z",
        created_by: {
          client_id: "usr_manager",
          username: "Manager",
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
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          warnings: [],
          data: {
            message: createdMessage,
          },
        }),
      });
    },
  );

  await page.route("**/api/v1/cases/*", async (route) => {
    const requestUrl = new URL(route.request().url());

    if (
      route.request().method() !== "GET" ||
      !/^\/api\/v1\/cases\/[^/]+$/.test(requestUrl.pathname)
    ) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: createCaseDetail(caseId, messages),
      }),
    });
  });

  await page.route("**/api/v1/cases?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          cases,
        },
      }),
    });
  });

  await page.route("**/api/v1/cases/unread-counts**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: {
          case_unread_counts: unreadCounts,
        },
      }),
    });
  });

  await page.route("**/api/v1/tasks/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        warnings: [],
        data: createTaskDetail(),
      }),
    });
  });
}

async function openCase(page: Page) {
  await page.goto("/cases");
  await page.getByTestId("case-card-case_composer").click();
  await expect(page.getByTestId("case-conversation-slide")).toBeVisible();
}

async function getComposerInput(page: Page) {
  const richEditor = page.getByTestId("case-rich-composer-editor");

  if ((await richEditor.count()) > 0) {
    return {
      kind: "rich" as const,
      locator: richEditor,
    };
  }

  return {
    kind: "basic" as const,
    locator: page.getByTestId("case-composer-textarea"),
  };
}

async function fillComposer(page: Page, text: string) {
  const composerInput = await getComposerInput(page);
  await composerInput.locator.fill(text);
}

async function getComposerText(page: Page): Promise<string> {
  const composerInput = await getComposerInput(page);

  if (composerInput.kind === "rich") {
    return (await composerInput.locator.textContent()) ?? "";
  }

  return composerInput.locator.inputValue();
}

async function focusRichComposerEditor(page: Page) {
  await page.getByTestId("case-rich-composer-editor").click();
}

async function installComposerAnimationSpy(page: Page) {
  await page.evaluate(() => {
    const editor = document.querySelector(
      '[data-testid="case-rich-composer-editor"]',
    );

    if (!editor) {
      throw new Error("Composer editor not found.");
    }

    const events: string[] = [];

    Object.defineProperty(window, "__caseComposerAnimationEvents", {
      configurable: true,
      value: events,
      writable: true,
    });

    editor.addEventListener("animationstart", (event) => {
      const animationEvent = event as AnimationEvent;
      events.push(animationEvent.animationName);
    });
  });
}

async function countComposerAnimationEvents(
  page: Page,
  animationName: string,
): Promise<number> {
  return page.evaluate(
    (targetAnimationName) =>
      (
        (
          window as typeof window & {
            __caseComposerAnimationEvents?: string[];
          }
        ).__caseComposerAnimationEvents ?? []
      ).filter((animation) => animation === targetAnimationName).length,
    animationName,
  );
}

async function longPressOwnMessage(page: Page, messageClientId: string) {
  const target = page.getByTestId(
    `case-message-actions-trigger-${messageClientId}`,
  );

  await target.dispatchEvent("pointerdown", { pointerType: "touch" });
  await page.waitForTimeout(600);
  await target.dispatchEvent("pointerup", { pointerType: "touch" });
}

test.describe("case composer", () => {
  test("keeps send disabled for empty and whitespace-only drafts", async ({
    page,
  }) => {
    await installComposerMocks(page);
    await openCase(page);

    const sendButton = page.getByTestId("case-composer-send-button");

    await expect(page.getByTestId("case-composer")).toBeVisible();
    await expect(page.getByTestId("case-rich-composer")).toBeVisible();
    await expect(sendButton).toBeDisabled();

    await fillComposer(page, "   ");
    await expect(sendButton).toBeDisabled();
  });

  test("rich composer mounts and typing enables send", async ({ page }) => {
    await installComposerMocks(page);
    await openCase(page);

    const sendButton = page.getByTestId("case-composer-send-button");

    await expect(page.getByTestId("case-rich-composer")).toBeVisible();
    await expect(page.getByTestId("case-rich-composer-editor")).toBeVisible();

    await fillComposer(page, "Plain text update");
    await expect(sendButton).toBeEnabled();
  });

  test("rich composer toolbar renders and color expands inline while other toggles still switch active state", async ({
    page,
  }) => {
    await installComposerMocks(page);
    await openCase(page);
    await focusRichComposerEditor(page);

    await expect(page.getByTestId("case-composer-toolbar")).toBeVisible();
    await expect(page.getByTestId("case-composer-toolbar-bold")).toBeVisible();
    await expect(
      page.getByTestId("case-composer-toolbar-underline"),
    ).toBeVisible();
    await expect(page.getByTestId("case-composer-toolbar-big")).toBeVisible();
    await expect(page.getByTestId("case-composer-toolbar-small")).toBeVisible();
    await expect(page.getByTestId("case-composer-toolbar-color")).toBeVisible();
    await expect(page.getByTestId("case-composer-toolbar-shake")).toBeVisible();
    await expect(page.getByTestId("case-composer-toolbar-pulse")).toBeVisible();
    await expect(
      page.getByTestId("case-composer-toolbar-mention"),
    ).toBeVisible();

    const boldButton = page.getByTestId("case-composer-toolbar-bold");
    await expect(boldButton).toHaveAttribute("data-state", "inactive");
    await boldButton.click();
    await expect(boldButton).toHaveAttribute("data-state", "active");
    await boldButton.click();
    await expect(boldButton).toHaveAttribute("data-state", "inactive");

    const bigButton = page.getByTestId("case-composer-toolbar-big");
    const smallButton = page.getByTestId("case-composer-toolbar-small");
    await bigButton.click();
    await expect(bigButton).toHaveAttribute("data-state", "active");
    await smallButton.click();
    await expect(bigButton).toHaveAttribute("data-state", "inactive");
    await expect(smallButton).toHaveAttribute("data-state", "active");
    await smallButton.click();
    await expect(smallButton).toHaveAttribute("data-state", "inactive");

    const colorButton = page.getByTestId("case-composer-toolbar-color");
    await colorButton.click();
    await expect(page.getByTestId("case-composer-color-sheet")).toHaveCount(0);
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-color"),
    ).toBeVisible();
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-dismiss"),
    ).toBeVisible();
    await page.getByTestId("case-composer-toolbar-expanded-dismiss").click();
    await expect(colorButton).toHaveAttribute("data-state", "inactive");

    const shakeButton = page.getByTestId("case-composer-toolbar-shake");
    await shakeButton.click();
    await expect(shakeButton).toHaveAttribute("data-state", "active");
    await shakeButton.click();
    await expect(shakeButton).toHaveAttribute("data-state", "inactive");

    const pulseButton = page.getByTestId("case-composer-toolbar-pulse");
    await pulseButton.click();
    await expect(pulseButton).toHaveAttribute("data-state", "active");
    await pulseButton.click();
    await expect(pulseButton).toHaveAttribute("data-state", "inactive");
  });

  test("rich composer toolbar only shows while editor is focused", async ({
    page,
  }) => {
    await installComposerMocks(page);
    await openCase(page);

    await page.getByTestId("case-conversation-header").click();
    await expect(page.getByTestId("case-composer-toolbar")).toHaveCount(0);

    await focusRichComposerEditor(page);
    await expect(page.getByTestId("case-composer-toolbar")).toBeVisible();
  });

  test("expanded color mode keeps typing working, does not scroll horizontally, and exits via default or x", async ({
    page,
  }) => {
    const focusConsoleErrors: string[] = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /(focus|selection|keyboard)/i.test(message.text())
      ) {
        focusConsoleErrors.push(message.text());
      }
    });

    await installComposerMocks(page);
    await openCase(page);
    await fillComposer(page, "Color flow");
    await focusRichComposerEditor(page);

    await page.getByTestId("case-composer-toolbar-color").click();
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-color"),
    ).toBeVisible();

    const toolbarMetrics = await page
      .getByTestId("case-composer-toolbar")
      .evaluate((element) => ({
        overflowX: window.getComputedStyle(element).overflowX,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));

    expect(toolbarMetrics.overflowX).toBe("hidden");
    expect(toolbarMetrics.scrollWidth).toBeLessThanOrEqual(
      toolbarMetrics.clientWidth,
    );

    await page.getByTestId("case-composer-toolbar-color-option-forest").click();
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-color"),
    ).toBeVisible();
    await expect(
      page.getByTestId("case-composer-toolbar-color-option-forest"),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.type(" still works");
    await expect
      .poll(() => getComposerText(page))
      .toBe("Color flow still works");

    await page
      .getByTestId("case-composer-toolbar-color-option-default")
      .click();
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-color"),
    ).toBeVisible();
    await expect(
      page.getByTestId("case-composer-toolbar-color-option-default"),
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("case-composer-toolbar-expanded-dismiss").click();
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-color"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("case-composer-toolbar-color"),
    ).toHaveAttribute("data-state", "inactive");
    expect(focusConsoleErrors).toEqual([]);
  });

  test("toolbar toggles keep typing and send working with backend-safe payloads", async ({
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

    await installComposerMocks(page, {
      onSendRequest: (body) => {
        sendRequests.push(body);
      },
    });
    await openCase(page);
    await focusRichComposerEditor(page);

    await page.getByTestId("case-composer-toolbar-bold").click();
    await page.getByTestId("case-composer-toolbar-shake").click();
    await page.getByTestId("case-composer-toolbar-mention").click();
    await page.getByTestId("case-composer-toolbar-color").click();
    await expect(page.getByTestId("case-composer-color-sheet")).toHaveCount(0);
    await expect(
      page.getByTestId("case-composer-toolbar-expanded-color"),
    ).toBeVisible();
    await page.getByTestId("case-composer-toolbar-color-option-rose").click();

    await fillComposer(page, "Styled composer update");
    await page.getByTestId("case-composer-send-button").click();

    await expect.poll(() => sendRequests.length).toBe(1);
    expect(sendRequests[0]).toEqual({
      client_id: expect.stringMatching(/^ccm_/),
      conversation_client_id: "ccv_case_composer",
      plain_text: "Styled composer update",
      content: [
        {
          type: "text",
          text: "Styled composer update",
          mention: null,
          label_value: null,
          link: null,
        },
      ],
    });

    await expect(page.getByText("Styled composer update")).toBeVisible();
    await expect.poll(() => getComposerText(page)).toBe("");
  });

  test("active animation plays on first typing and replays once when the toggle is turned off", async ({
    page,
  }) => {
    await installComposerMocks(page);
    await openCase(page);
    await focusRichComposerEditor(page);
    await installComposerAnimationSpy(page);

    await page.getByTestId("case-composer-toolbar-shake").click();
    await page.keyboard.type("A");

    await expect
      .poll(() =>
        countComposerAnimationEvents(page, "case-composer-inline-shake"),
      )
      .toBeGreaterThanOrEqual(1);

    await page.keyboard.type("nimated text");
    await page.getByTestId("case-composer-toolbar-shake").click();

    await expect
      .poll(() =>
        countComposerAnimationEvents(page, "case-composer-inline-shake"),
      )
      .toBeGreaterThanOrEqual(2);

    await page.getByTestId("case-composer-toolbar-pulse").click();
    await page.keyboard.type("P");

    await expect
      .poll(() =>
        countComposerAnimationEvents(page, "case-composer-inline-pulse"),
      )
      .toBeGreaterThanOrEqual(1);

    await page.keyboard.type("ulse text");
    await page.getByTestId("case-composer-toolbar-pulse").click();

    await expect
      .poll(() =>
        countComposerAnimationEvents(page, "case-composer-inline-pulse"),
      )
      .toBeGreaterThanOrEqual(2);
  });

  test("sending posts one text block, shows the new message, clears the draft, and keeps the last row above the composer", async ({
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

    await fillComposer(page, "  Warehouse update is ready.  ");
    await page.getByTestId("case-composer-send-button").click();

    await expect.poll(() => sendRequests.length).toBe(1);
    expect(sendRequests[0]?.conversation_client_id).toBe("ccv_case_composer");
    expect(sendRequests[0]?.plain_text).toBe("Warehouse update is ready.");
    expect(sendRequests[0]?.content).toEqual([
      {
        type: "text",
        text: "Warehouse update is ready.",
        mention: null,
        label_value: null,
        link: null,
      },
    ]);
    expect(sendRequests[0]?.client_id).toMatch(/^ccm_/);

    await expect(page.getByText("Warehouse update is ready.")).toBeVisible();
    await expect.poll(() => getComposerText(page)).toBe("");
    await expect
      .poll(() => markReadRequests.at(-1)?.up_to_message_seq ?? null)
      .toBe(4);

    const composerBox = await page.getByTestId("case-composer").boundingBox();
    const lastMessageBox = await page
      .getByTestId(`case-message-row-${sendRequests[0]?.client_id}`)
      .boundingBox();

    expect(composerBox).not.toBeNull();
    expect(lastMessageBox).not.toBeNull();
    expect(
      (lastMessageBox?.y ?? 0) + (lastMessageBox?.height ?? 0),
    ).toBeLessThanOrEqual((composerBox?.y ?? 0) + 2);
  });

  test("failed send keeps the draft recoverable and exposes a retry path", async ({
    page,
  }) => {
    await installComposerMocks(page, { failuresBeforeSuccess: 1 });
    await openCase(page);

    await fillComposer(page, "Retry this draft");
    await page.getByTestId("case-composer-send-button").click();

    await expect(page.getByTestId("case-composer-error")).toBeVisible();
    await expect(page.getByTestId("case-composer-error")).toContainText(
      "Message send failed.",
    );
    await expect.poll(() => getComposerText(page)).toBe("Retry this draft");

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText("Retry this draft")).toBeVisible();
    await expect.poll(() => getComposerText(page)).toBe("");
    await expect(page.getByTestId("case-composer-error")).toHaveCount(0);
  });

  test("own messages open the action sheet", async ({ page }) => {
    await installComposerMocks(page);
    await openCase(page);

    await expect(
      page.getByTestId("case-message-actions-trigger-ccm_case_composer_2"),
    ).toBeVisible();
    await expect(
      page.getByTestId("case-message-actions-trigger-ccm_case_composer_1"),
    ).toHaveCount(0);

    await longPressOwnMessage(page, "ccm_case_composer_2");

    await expect(page.getByTestId("case-message-actions-sheet")).toBeVisible();
    await expect(page.getByTestId("case-message-edit-button")).toBeVisible();
    await expect(page.getByTestId("case-message-delete-button")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __caseComposerVibrateCalls?: Array<number | number[]>;
              }
            ).__caseComposerVibrateCalls?.length ?? 0,
        ),
      )
      .toBe(1);
  });

  test("editing updates the rendered bubble, shows the edited indicator, and preserves the send draft", async ({
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

    await fillComposer(page, "Draft to keep");
    await longPressOwnMessage(page, "ccm_case_composer_2");
    await page.getByTestId("case-message-edit-button").click();

    await expect(page.getByTestId("case-composer-edit-mode")).toBeVisible();
    await expect
      .poll(() => getComposerText(page))
      .toBe("I am checking the warehouse notes now.");

    await fillComposer(
      page,
      "  Updated warehouse note for the customer file.  ",
    );
    await page.getByTestId("case-composer-save-button").click();

    await expect.poll(() => editRequests.length).toBe(1);
    expect(editRequests[0]).toEqual({
      message_client_id: "ccm_case_composer_2",
      plain_text: "Updated warehouse note for the customer file.",
      content: [
        {
          type: "text",
          text: "Updated warehouse note for the customer file.",
          mention: null,
          label_value: null,
          link: null,
        },
      ],
    });

    await expect(
      page.getByTestId("case-message-bubble-ccm_case_composer_2"),
    ).toContainText("Updated warehouse note for the customer file.");
    await expect(
      page.getByTestId("case-message-edited-indicator-ccm_case_composer_2"),
    ).toBeVisible();
    await expect.poll(() => getComposerText(page)).toBe("Draft to keep");
  });

  test("soft delete replaces the message content with the deleted placeholder", async ({
    page,
  }) => {
    const deleteRequests: string[] = [];

    await installComposerMocks(page, {
      onDeleteRequest: (messageClientId) => {
        deleteRequests.push(messageClientId);
      },
    });
    await openCase(page);

    await longPressOwnMessage(page, "ccm_case_composer_2");
    await page.getByTestId("case-message-delete-button").click();
    await page.getByTestId("case-message-delete-button").click();

    await expect.poll(() => deleteRequests).toEqual(["ccm_case_composer_2"]);
    await expect(
      page.getByTestId("case-message-deleted-placeholder-ccm_case_composer_2"),
    ).toBeVisible();
    await expect(
      page.getByTestId("case-message-row-ccm_case_composer_2"),
    ).toBeVisible();
  });

  test("basic fallback mode still works when configured", async ({ page }) => {
    await setCaseComposerMode(page, "basic");
    await installComposerMocks(page);
    await openCase(page);

    await expect(page.getByTestId("case-composer-textarea")).toBeVisible();
    await expect(page.getByTestId("case-rich-composer")).toHaveCount(0);

    await fillComposer(page, "Fallback composer still sends");
    await page.getByTestId("case-composer-send-button").click();

    await expect(page.getByText("Fallback composer still sends")).toBeVisible();
    await expect.poll(() => getComposerText(page)).toBe("");
  });
});
