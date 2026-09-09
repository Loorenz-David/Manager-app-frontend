import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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
    facet: null,
    participating_section_count: 1,
    sections_by_basis: {
      item_properties_narrowed: 0,
      item_facet_narrowed: 0,
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
  projection_quantity: 1,
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
        typical_unit_worker_seconds: "3600",
        projected_typical_worker_seconds: 3_600,
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

function renderSection(
  surfaceOpeners?: React.ComponentProps<
    typeof ProductionTimeSection
  >["surfaceOpeners"],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProductionTimeSection
        surfaceOpeners={surfaceOpeners}
        taskId="tsk_example"
      />
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

  it("shows the static budget, capped live pressure and typical metrics", async () => {
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(literalHandoffPayload))),
    );

    renderSection();

    await screen.findByTestId("production-time-card");
    const firstRow = screen.getAllByTestId("production-time-row")[0]!;
    expect(within(firstRow).getByTestId("production-time-metric-budget")).toHaveTextContent(
      "Budget1h 0m",
    );
    expect(within(firstRow).getByTestId("production-time-metric-pressure")).toHaveTextContent(
      "Pressure40m",
    );
    // Typical travels to the row headline. No unit marker on it: this is a
    // one-piece order, so the card offers no toggle and speaks one unit
    // throughout.
    expect(within(firstRow).getByTestId("production-time-row-time")).toHaveTextContent(
      "Typical1h 0m",
    );
  });

  it("swaps the typical between the two SERVED figures, never a division", async () => {
    // Unit 140s at quantity 3 projects to 7m. The card opens on the whole order
    // and reads 7m; pressing "Per piece" must read 2m — the served unit median,
    // not 420/3, which is the derivation the handoff rules out.
    const base = literalHandoffPayload.sections[0]!;
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json(
          envelope({
            ...literalHandoffPayload,
            projection_quantity: 3,
            sections: [
              {
                ...base,
                typical: {
                  ...base.typical!,
                  typical_worker_seconds: 600,
                  typical_unit_worker_seconds: "140",
                  projected_typical_worker_seconds: 420,
                },
              },
            ],
          }),
        ),
      ),
    );

    renderSection();

    await screen.findByTestId("production-time-card");
    const firstRow = screen.getAllByTestId("production-time-row")[0]!;
    expect(
      within(firstRow).getByTestId("production-time-row-time"),
    ).toHaveTextContent("Typical7m");

    await userEvent.click(screen.getByTestId("production-time-unit-piece"));

    expect(
      within(screen.getAllByTestId("production-time-row")[0]!).getByTestId(
        "production-time-row-time",
      ),
    ).toHaveTextContent("Typical2m");
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

describe("ProductionTimeSection — typical strategy disclosure", () => {
  const FACET_PAYLOAD: TaskProductionTime = {
    ...literalHandoffPayload,
    typical_resolution: {
      task_typical_basis: "item_facet_narrowed_uniform",
      reconciliation_method: "uniform_basis_v1",
      comparability_profile: "primary_item_category_properties_v2",
      applied_filter: {
        item_category_ids: ["itc_chair"],
        item_categories: [{ client_id: "itc_chair", name: "Dining chair" }],
        properties_signature: "sig-mahogany-ud",
        properties_facets: [{ upholstery: "Up & Down" }],
      },
      facet: "upholstery",
      participating_section_count: 2,
      sections_by_basis: {
        item_properties_narrowed: 0,
        item_facet_narrowed: 1,
        item_narrowed: 0,
        section_wide: 1,
        insufficient_sample: 0,
      },
    },
  };

  it("carries a facet basis from the wire through to the pill", async () => {
    // The whole path: a payload whose basis and facet the client could not even
    // represent before the enum was widened, ending in copy a reader can act on.
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(FACET_PAYLOAD))),
    );

    renderSection();

    await screen.findByTestId("production-time-card");
    expect(screen.getByTestId("typical-strategy-pill")).toHaveTextContent(
      "Typical fromSame upholstery",
    );
    expect(screen.getByTestId("typical-strategy-pill")).toHaveAttribute(
      "data-tone",
      "narrow",
    );
  });

  it("hands the built strategy to the injected opener on press", async () => {
    const user = userEvent.setup();
    const openTypicalStrategy = vi.fn();
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(FACET_PAYLOAD))),
    );

    renderSection({ openTypicalStrategy });

    await screen.findByTestId("production-time-card");
    await user.click(screen.getByTestId("typical-strategy-pill"));

    expect(openTypicalStrategy).toHaveBeenCalledTimes(1);
    const [{ strategy }] = openTypicalStrategy.mock.calls[0]!;
    expect(strategy.pillLabel).toBe("Same upholstery");
    // The mixed task is exactly the case the breakdown exists for.
    expect(strategy.breakdown).toEqual([
      { label: "Same facet", value: "1 of 2 stages" },
      { label: "All work in the stage", value: "1 of 2 stages" },
    ]);
  });

  it("shows the pill on a short pipeline that never expands", async () => {
    // The rows toggle only appears above three stages. Putting the pill inside
    // the expanded region would have hidden provenance from the simplest tasks.
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(FACET_PAYLOAD))),
    );

    renderSection();

    await screen.findByTestId("production-time-card");
    expect(
      screen.queryByTestId("production-time-rows-toggle"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("typical-strategy-pill")).toBeInTheDocument();
  });

  it("states the pill without a button when no opener was injected", async () => {
    server.use(
      http.get(ENDPOINT, () => HttpResponse.json(envelope(FACET_PAYLOAD))),
    );

    renderSection();

    await screen.findByTestId("production-time-card");
    expect(screen.getByTestId("typical-strategy-pill").tagName).toBe("SPAN");
  });
});
