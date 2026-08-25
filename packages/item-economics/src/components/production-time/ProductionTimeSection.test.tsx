import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { TaskProductionTime } from "../../types";
import { ProductionTimeSection } from "./ProductionTimeSection";

const ENDPOINT =
  "http://localhost/api/v1/item-economics/tasks/tsk_example/production-time";

const literalHandoffPayload: TaskProductionTime = {
  task_id: "tsk_example",
  status: "ok",
  item_binding: "bound",
  allocation_method: "static_proportional_section_v2",
  pressure_ratio: "1.00",
  pressure_method: "open_share_proportional_v1",
  typical_resolution: {
    task_typical_basis: "section_wide_uniform",
    reconciliation_method: "uniform_basis_v1",
    comparability_profile: "primary_item_category_v1",
    applied_filter: null,
    participating_section_count: 1,
    sections_by_basis: {
      item_narrowed: 0,
      section_wide: 1,
      insufficient_sample: 0,
    },
  },
  budget: {
    allowed_worker_minutes: "195.00",
    actual_worker_seconds: 9_600,
    actual_worker_minutes: "160.00",
    remaining_worker_minutes: "35.00",
    percent_consumed: "82.05",
  },
  final: null,
  sections: [
    {
      working_section_id: "wsec_upholstery",
      section_name: "upholstery installation",
      section_name_snapshot: "upholstery installation",
      order_list: 7,
      state: "working",
      state_entered_at: "2026-08-17T09:12:00+00:00",
      worked_seconds: 1_500,
      step_count: 2,
      allowance_seconds: 3_600,
      pressure_share_seconds: 2_400,
      left_seconds: 2_100,
      share_state: "on_track",
      typical: {
        typical_worker_seconds: 3_600,
        sample_count: 23,
        typical_basis: "section_wide" as const,
        narrowed_sample_count: 0,
        section_sample_count: 23,
        method: "median_completed_section_totals",
        window_days: 90,
        min_sample_size: 5,
      },
    },
    {
      working_section_id: "wsec_failed",
      section_name: "failed repair",
      section_name_snapshot: "failed repair",
      order_list: 8,
      state: "working",
      state_entered_at: null,
      worked_seconds: 600,
      step_count: 1,
      allowance_seconds: 0,
      pressure_share_seconds: 0,
      left_seconds: -600,
      share_state: "over_share",
      typical: null,
    },
    {
      working_section_id: "wsec_deleted",
      section_name: null,
      section_name_snapshot: "deleted polishing section",
      order_list: null,
      state: "completed",
      state_entered_at: null,
      worked_seconds: 900,
      step_count: 1,
      allowance_seconds: 1_200,
      pressure_share_seconds: null,
      left_seconds: 300,
      share_state: "on_track",
      typical: null,
    },
  ],
};

function envelope(data: TaskProductionTime) {
  return { ok: true as const, warnings: [], data };
}

const server = setupServer();

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProductionTimeSection taskId="tsk_example" />
    </QueryClientProvider>,
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("ProductionTimeSection MSW boundary", () => {
  it("renders the literal payload in order with reassignment, zero allowance and deletion", async () => {
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(literalHandoffPayload))),
    );

    renderSection();

    expect(screen.getByTestId("production-time-skeleton")).toBeInTheDocument();
    await screen.findByTestId("production-time-card");
    expect(
      screen.getAllByTestId("production-time-row-label").map((node) => node.textContent),
    ).toEqual([
      "upholstery installation",
      "failed repair",
      "deleted polishing section",
    ]);
    expect(screen.getByTestId("production-time-row-passes")).toHaveTextContent(
      "2 passes",
    );
    const zeroAllowanceFill = screen
      .getAllByTestId("production-time-row-progress")[1]
      ?.querySelector("span");
    expect(zeroAllowanceFill).toHaveStyle({ width: "100%" });
  });

  it("renders a non-ok response with summed work, typicals and no bar", async () => {
    const noBudgetPayload: TaskProductionTime = {
      ...literalHandoffPayload,
      status: "not_evaluated",
      budget: {
        allowed_worker_minutes: null,
        actual_worker_seconds: null,
        actual_worker_minutes: null,
        remaining_worker_minutes: null,
        percent_consumed: null,
      },
      sections: literalHandoffPayload.sections.map((section) => ({
        ...section,
        state: section.state === "working" ? "paused" : section.state,
        state_entered_at: null,
        allowance_seconds: null,
        left_seconds: null,
        share_state: "no_budget" as const,
      })),
    };
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(noBudgetPayload))),
    );

    renderSection();

    await screen.findByTestId("production-time-no-budget");
    expect(screen.getByTestId("production-time-no-budget-reason")).toHaveTextContent(
      "Budget not calculated yet",
    );
    expect(screen.getByText("50m")).toBeInTheDocument();
    expect(screen.queryByTestId("production-time-budget-bar")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("production-time-row")).toHaveLength(3);
  });

  it("shows the static assignment beside the live pressure share", async () => {
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(literalHandoffPayload))),
    );

    renderSection();

    await screen.findByTestId("production-time-card");
    expect(screen.getAllByTestId("production-time-row-budget")[0]).toHaveTextContent(
      "1h 0m assigned · 40m pressure · typical 1h 0m",
    );
  });

  it("hides a 404 without retrying", async () => {
    let requestCount = 0;
    server.use(
      http.get(ENDPOINT, () => {
        requestCount += 1;
        return HttpResponse.json(
          { error: "Task not found.", ok: false },
          { status: 404 },
        );
      }),
    );

    const { container } = renderSection();

    await waitFor(() => expect(requestCount).toBe(1));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("keeps the frame on an error and retries from the button", async () => {
    let requestCount = 0;
    server.use(
      http.get(ENDPOINT, () => {
        requestCount += 1;
        return HttpResponse.json(
          { error: "Production time failed.", ok: false },
          { status: 500 },
        );
      }),
    );
    const user = userEvent.setup();

    renderSection();

    await screen.findByTestId(
      "production-time-error",
      {},
      { timeout: 3_000 },
    );
    expect(requestCount).toBe(2);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(requestCount).toBeGreaterThan(2));
  });

  it("passes mismatched bindings to the card's unavailable branch", async () => {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json(
          envelope({ ...literalHandoffPayload, item_binding: "mismatched" }),
        ),
      ),
    );

    renderSection();

    await screen.findByTestId("production-time-unavailable");
    expect(screen.queryByTestId("production-time-row")).not.toBeInTheDocument();
  });

  it("lets the card render an empty sections payload as nothing", async () => {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json(
          envelope({ ...literalHandoffPayload, sections: [] }),
        ),
      ),
    );

    const { container } = renderSection();

    await waitFor(() =>
      expect(
        screen.queryByTestId("production-time-skeleton"),
      ).not.toBeInTheDocument(),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
