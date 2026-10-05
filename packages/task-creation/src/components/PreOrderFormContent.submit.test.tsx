import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreOrderFormContent } from "./PreOrderFormContent";
import { buildPreOrderFormDefaultValues } from "../lib/pre-order-form-default-values";

const mocks = vi.hoisted(() => ({
  submit: undefined as undefined | (() => Promise<void>),
  withShopify: false,
  create: vi.fn(),
  onCreated: vi.fn(),
  close: vi.fn(),
  socket: { on: vi.fn(), off: vi.fn() },
}));

vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-hook-form")>();
  return {
    ...actual,
    useForm: (options: Parameters<typeof actual.useForm>[0]) => {
      const defaults = buildPreOrderFormDefaultValues(true);
      return actual.useForm({
        ...options,
        defaultValues: {
          ...defaults,
          has_shopify_shops: mocks.withShopify,
          item: { ...defaults.item, major_category: "wood", item_category_id: "cat-1" },
          customer: { ...defaults.customer, display_name: "Ada", customer_type: "private", primary_phone_number: "+46700000000" },
          shopIntegrationIds: mocks.withShopify ? ["shop-1"] : [],
          inventoryQuantities: mocks.withShopify
            ? [{ shopIntegrationId: "shop-1", locationId: "loc-1", quantity: 1 }]
            : [],
        },
      });
    },
  };
});
vi.mock("@beyo/hooks", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/hooks")>(),
  useSurface: () => ({ close: mocks.close }),
  usePreloadSurface: () => {},
  useStagedForm: (options: { onSubmit: () => Promise<void> }) => {
    mocks.submit = options.onSubmit;
    return { steps: [], stepStatusMap: {}, navigateTo: vi.fn() };
  },
}));
vi.mock("@beyo/ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/ui")>(),
  StagedForm: () => null,
  usePrefetchOnCondition: () => {},
}));
vi.mock("@beyo/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/auth")>(),
  useRole: () => ({ hasRole: () => true }),
}));
vi.mock("@beyo/tasks", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/tasks")>(),
  useCreateTask: () => ({ mutateAsync: mocks.create }),
}));
vi.mock("@beyo/images", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/images")>(),
  useEntityImagesQuery: () => ({ data: [] }),
}));
vi.mock("@beyo/realtime", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/realtime")>(),
  useSocket: () => mocks.socket,
}));
vi.mock("../hooks/use-lookup-item-images", () => ({ useLookupItemImages: () => vi.fn() }));
vi.mock("../hooks/use-preorder-shopify-availability", () => ({ usePreorderShopifyAvailability: () => {} }));
vi.mock("../hooks/use-shopify-customer-lookup-prefill", () => ({
  useShopifyCustomerLookupPrefill: () => ({ status: "idle", retry: vi.fn() }),
}));
vi.mock("../providers/TaskCreationFormProvider", () => ({
  useTaskCreationFormContext: () => ({
    taskClientId: "task-1", itemClientId: "item-1", customerClientId: "customer-1",
    noteClientId: "note-1", currentUserClientId: "user-1", hasSkuTemplate: true,
    skuPreview: "PRE-1", callbacks: { onTaskCreated: mocks.onCreated },
  }),
}));

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PreOrderFormContent onRequestNewForm={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("pre-order submission status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withShopify = false;
    mocks.create.mockResolvedValue({ client_id: "task-1", item_sku: "PRE-1" });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows only preorder creation and waits for the API before success", async () => {
    vi.useFakeTimers();
    let resolveRequest!: (result: { client_id: string; item_sku: string }) => void;
    mocks.create.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    mount();
    let submission!: Promise<void>;
    await act(async () => { submission = mocks.submit!(); });
    expect(screen.getByText("Creating pre-order…")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(screen.getByText("Creating pre-order…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Another" })).toBeNull();
    await act(async () => {
      resolveRequest({ client_id: "task-1", item_sku: "PRE-1" });
      await submission;
    });
    expect(screen.getByText("Pre-order created")).toBeTruthy();
  });

  it("finishes on the API response when Shopify is omitted", async () => {
    mount();
    await act(async () => { await mocks.submit!(); });
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty("shopify_preorder");
    expect(screen.getByText("Pre-order created")).toBeTruthy();
    expect(screen.getByTestId("task-creation-submit-overlay").getAttribute("data-phase")).toBe("succeeded");
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Another" })).toBeTruthy();
    expect(mocks.socket.on).not.toHaveBeenCalled();
    expect(mocks.onCreated).toHaveBeenCalledOnce();
  });

  it("still waits for the Shopify processed event when Shopify is requested", async () => {
    mocks.withShopify = true;
    mount();
    await act(async () => { await mocks.submit!(); });
    expect(mocks.create.mock.calls[0][0]).toHaveProperty("shopify_preorder");
    expect(screen.getByText("Creating pre-order and Shopify order…")).toBeTruthy();
    const listener = mocks.socket.on.mock.calls.find(([event]) => event === "shopify.preorder.processed")?.[1];
    expect(listener).toBeDefined();
    act(() => listener({ task_id: "task-1", status: "succeeded", error_message: null }));
    expect(screen.getByText("Pre-order and Shopify order created")).toBeTruthy();
  });

  it("removes the overlay if the creation request fails", async () => {
    mocks.create.mockRejectedValue(new Error("Request failed"));
    mount();
    await act(async () => { await mocks.submit!(); });
    expect(screen.queryByTestId("task-creation-submit-overlay")).toBeNull();
    expect(mocks.onCreated).not.toHaveBeenCalled();
  });
});
