import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { referenceScenario } from "../test-support/price-scenario-reference";
import type { PriceScenario } from "../types";
import { ItemValuationSlidePage } from "./ItemValuationSlidePage";

const mocks = vi.hoisted(() => ({
  fetchTaskPriceScenario: vi.fn(),
  commitTaskEvaluation: vi.fn(),
  fetchItemLookup: vi.fn(),
  putItemValuation: vi.fn(),
}));

vi.mock("../api/fetch-task-price-scenario", () => ({
  fetchTaskPriceScenario: mocks.fetchTaskPriceScenario,
}));
vi.mock("../api/commit-task-evaluation", () => ({
  commitTaskEvaluation: mocks.commitTaskEvaluation,
}));
vi.mock("../api/put-item-valuation", () => ({
  putItemValuation: mocks.putItemValuation,
}));
vi.mock("@beyo/items", () => ({ fetchItemLookup: mocks.fetchItemLookup }));

vi.mock("@beyo/auth", () => ({
  useAuth: () => ({ user: { id: "usr_current" } }),
}));

const surfaceHeaderMock = vi.hoisted(() => ({
  setTitle: vi.fn(),
  setActions: vi.fn(),
  requestClose: vi.fn(),
  setHeaderHidden: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceProps: () => ({ taskId: "tsk_ref0001" }),
  useSurfaceHeader: () => surfaceHeaderMock,
}));

/** sv-SE groups with U+00A0, never an ASCII space (projection L7). */
function grouped(value: string): string {
  return value.replace(/ /g, " ");
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return render(<ItemValuationSlidePage />, { wrapper: Wrapper });
}

async function renderScenario(scenario: PriceScenario) {
  mocks.fetchTaskPriceScenario.mockResolvedValue(scenario);
  renderPage();
  await waitFor(() =>
    expect(screen.queryByTestId("item-valuation-skeleton")).not.toBeInTheDocument(),
  );
}

function purchaseRequiredScenario(): PriceScenario {
  const scenario = referenceScenario();
  scenario.saved = null;
  scenario.currency = null;
  scenario.status = "item_unvalued";
  return scenario;
}

function blockedScenario(): PriceScenario {
  const scenario = referenceScenario();
  // The four numeric blocks are published together or not at all (§5.2).
  scenario.model = null;
  scenario.anchors = null;
  scenario.domain = null;
  scenario.config_fingerprint = null;
  scenario.status = "not_configured_no_cost_group";
  scenario.can_commit = false;
  return scenario;
}

function unboundScenario(): PriceScenario {
  const scenario = referenceScenario();
  scenario.item_binding = "detached";
  scenario.item = null;
  scenario.saved = null;
  scenario.currency = null;
  scenario.model = null;
  scenario.anchors = null;
  scenario.domain = null;
  scenario.config_fingerprint = null;
  scenario.can_commit = false;
  return scenario;
}

describe("ItemValuationSlidePage — state to rendered blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("22a. purchase_required shows the bootstrap message and no price", async () => {
    await renderScenario(purchaseRequiredScenario());

    expect(
      screen.queryByTestId("item-valuation-per-piece"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("item-valuation-bootstrap-message"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("item-valuation-fetch-purchase")).toBeEnabled();
  });

  it("22a-b. purchase_required with no article number disables the CTA", async () => {
    const scenario = purchaseRequiredScenario();
    scenario.item = { ...scenario.item!, article_number: null };

    await renderScenario(scenario);

    expect(screen.getByTestId("item-valuation-fetch-purchase")).toBeDisabled();
    expect(
      screen.getByTestId("item-valuation-bootstrap-message"),
    ).toHaveTextContent("no article number");
  });

  it("22b. a null model renders no numbers and a disabled Save with its reason", async () => {
    await renderScenario(blockedScenario());

    expect(
      screen.queryByTestId("item-valuation-per-piece"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("item-valuation-total-line"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("item-valuation-at-price")).not.toBeInTheDocument();
    expect(screen.getByTestId("item-valuation-save-button")).toBeDisabled();
    expect(screen.getByTestId("item-valuation-save-reason")).toHaveTextContent(
      "Saving is unavailable while the pricing configuration is incomplete.",
    );
  });

  it("22c. an unbound task keeps the frame, names what is missing and offers no Save", async () => {
    await renderScenario(unboundScenario());

    expect(screen.getByTestId("item-valuation-empty-state")).toHaveTextContent(
      "no item attached",
    );
    expect(
      screen.queryByTestId("item-valuation-save-button"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("item-valuation-per-piece"),
    ).not.toBeInTheDocument();
    // The frame survives, which is the whole point of the empty state.
    expect(screen.getByTestId("item-valuation-header")).toBeInTheDocument();
  });

  it("22d. the page adds exactly one testid of its own", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "ItemValuationSlidePage.tsx"),
      "utf8",
    );

    // `-header` and `-menu-button` already come from `ItemValuationFrame`; the
    // page must not re-declare them (review r1 L3). Query-selector lookups by
    // testid are not declarations and are matched separately.
    const declarations =
      source.match(/(?<!\[)data-testid="([^"]+)"/g) ?? [];

    expect(declarations).toEqual([
      'data-testid="item-valuation-page"',
      'data-testid="item-valuation-page"',
    ]);
  });
});

/**
 * 22e — the one place where a fixture-class error (review r1 S1) is caught by a
 * failing test: the Reference payload goes through the real query, the real
 * reducer and the real arithmetic, and the rendered strings are asserted
 * exactly.
 */
describe("ItemValuationSlidePage — the numbers meet the arithmetic once (22e)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders the Reference payload's per-piece price, AT PRICE and TYPICAL", async () => {
    await renderScenario(referenceScenario());

    // 855 000 ÷ (100 × 6).
    // `toHaveTextContent` normalises whitespace, so the group separator is
    // asserted in its exact form on the aria-valuetext below instead.
    expect(screen.getByTestId("item-valuation-per-piece")).toHaveTextContent(
      "1 425",
    );
    // 855 000 → budget 188 100 → 14 469 centimin → 8 681 s → 145 min.
    expect(screen.getByTestId("item-valuation-at-price")).toHaveTextContent(
      "2h 25m",
    );
    // typical.total_seconds 12 300 → 205 min.
    expect(screen.getByTestId("item-valuation-typical")).toHaveTextContent(
      "3h 25m",
    );
    expect(screen.getByTestId("item-valuation-header")).toHaveTextContent(
      "ITEM 0000608 · DINING CHAIRS (6)",
    );
  });

  it("22f-render. the provenance avatar slot is not empty", async () => {
    await renderScenario(referenceScenario());

    const avatar = screen.getByTestId("item-valuation-provenance-avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar.childElementCount).toBeGreaterThan(0);
    expect(screen.getByTestId("item-valuation-provenance")).toHaveTextContent(
      "Marta Lind",
    );
  });
});

describe("ItemValuationSlidePage — accessibility (22g)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("announces the drafted price and renders its own header with the close arrow", async () => {
    await renderScenario(referenceScenario());

    expect(screen.getByTestId("item-valuation-slider-input")).toHaveAttribute(
      "aria-valuetext",
      `${grouped("1 425")} SEK per piece`,
    );
    // Owner redesign round 3: the surface's built-in header is hidden and the
    // page owns arrow + title, aligned with identity and provenance.
    expect(surfaceHeaderMock.setHeaderHidden).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("item-valuation-header")).toHaveTextContent(
      "Expected sold price",
    );
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByTestId("item-valuation-back-arrow"));
    expect(surfaceHeaderMock.requestClose).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId("item-valuation-menu-button"),
    ).not.toBeInTheDocument();
  });

  it("keeps the announcement in step with the draft", async () => {
    await renderScenario(referenceScenario());

    const input = screen.getByTestId("item-valuation-slider-input");
    // The band's top end: 1 650 000 ÷ 600 = 2 750.
    input.focus();
    await waitFor(() => expect(input).toHaveFocus());

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "82" } });

    await waitFor(() =>
      expect(input).toHaveAttribute(
        "aria-valuetext",
        `${grouped("2 750")} SEK per piece`,
      ),
    );
  });
});
