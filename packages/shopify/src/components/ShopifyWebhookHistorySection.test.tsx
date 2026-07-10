import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShopifyWebhookHistorySection } from "./ShopifyWebhookHistorySection";

const useShopifyWebhookHistoryInfiniteQueryMock = vi.fn();

vi.mock("../api/use-shopify-webhook-history-infinite-query", () => ({
  useShopifyWebhookHistoryInfiniteQuery: (...args: unknown[]) =>
    useShopifyWebhookHistoryInfiniteQueryMock(...args),
}));

const WEBHOOK_INTAKE_RECORD = {
  record_type: "webhook_intake" as const,
  client_id: "hist_intake_1",
  shop_integration_id: "shop_1",
  shop_domain: "alpha.myshopify.com",
  topic: "orders/create",
  webhook_id: "wh_1",
  status: "processed" as const,
  retryable: false,
  attempts: 1,
  received_at: "2026-07-01T10:00:00+00:00",
  processing_started_at: "2026-07-01T10:00:02+00:00",
  processed_at: "2026-07-01T10:00:04+00:00",
  last_error: null,
  created_at: "2026-07-01T10:00:00+00:00",
  updated_at: "2026-07-01T10:00:04+00:00",
};

const INTEGRATION_EVENT_RECORD = {
  record_type: "integration_event" as const,
  client_id: "hist_evt_1",
  shop_integration_id: "shop_1",
  event_type: "disconnect" as const,
  severity: "error" as const,
  message: "The integration was disconnected.",
  metadata_json: {
    retries_exhausted: true,
    nested: { ignored: true },
  },
  created_by: null,
  created_at: "2026-07-01T10:05:00+00:00",
};

function buildInfiniteQueryState(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  };
}

describe("ShopifyWebhookHistorySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState(),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("returns null when the selected shop id is missing and still uses the disabled query input", () => {
    const { container } = render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId={null} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(useShopifyWebhookHistoryInfiniteQueryMock).toHaveBeenCalledWith({
      shopIntegrationId: null,
    });
  });

  it("renders compact loading rows", () => {
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({ isPending: true }),
    );

    render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    expect(
      screen.getByTestId("shopify-webhook-history-loading"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("renders an error state and retries", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({
        isError: true,
        error: new Error("Nope"),
        refetch,
      }),
    );

    render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    expect(
      screen.getByText("Webhook activity could not be loaded."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state", () => {
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({
        data: {
          pages: [
            {
              webhook_history_records: [],
              webhook_history_records_pagination: {
                limit: 3,
                offset: 0,
                has_more: false,
              },
            },
          ],
        },
      }),
    );

    render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    expect(screen.getByText("No webhook activity yet.")).toBeInTheDocument();
  });

  it("renders webhook intake and integration event records in backend order", () => {
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({
        data: {
          pages: [
            {
              webhook_history_records: [
                WEBHOOK_INTAKE_RECORD,
                INTEGRATION_EVENT_RECORD,
              ],
              webhook_history_records_pagination: {
                limit: 3,
                offset: 0,
                has_more: true,
              },
            },
          ],
        },
        hasNextPage: true,
      }),
    );

    render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    expect(
      screen.getAllByTestId(/shopify-(webhook-intake|integration-event)-record-card/),
    ).toHaveLength(2);
    expect(screen.getByText("orders/create")).toBeInTheDocument();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("shows a working Show more button and a fetching-more state", async () => {
    const user = userEvent.setup();
    const fetchNextPage = vi.fn();
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({
        data: {
          pages: [
            {
              webhook_history_records: [WEBHOOK_INTAKE_RECORD],
              webhook_history_records_pagination: {
                limit: 3,
                offset: 0,
                has_more: true,
              },
            },
          ],
        },
        fetchNextPage,
        hasNextPage: true,
      }),
    );

    const { rerender } = render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    await user.click(screen.getByRole("button", { name: "Show more" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({
        data: {
          pages: [
            {
              webhook_history_records: [WEBHOOK_INTAKE_RECORD],
              webhook_history_records_pagination: {
                limit: 3,
                offset: 0,
                has_more: true,
              },
            },
          ],
        },
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    );

    rerender(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    expect(
      screen.getByRole("button", { name: "Loading more..." }),
    ).toBeDisabled();
  });

  it("hides Show more when there are no more pages", () => {
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue(
      buildInfiniteQueryState({
        data: {
          pages: [
            {
              webhook_history_records: [WEBHOOK_INTAKE_RECORD],
              webhook_history_records_pagination: {
                limit: 3,
                offset: 0,
                has_more: false,
              },
            },
          ],
        },
        hasNextPage: false,
      }),
    );

    render(
      <ShopifyWebhookHistorySection selectedShopIntegrationId="shop_1" />,
    );

    expect(
      screen.queryByRole("button", { name: "Show more" }),
    ).not.toBeInTheDocument();
  });
});
