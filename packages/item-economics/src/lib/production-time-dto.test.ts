import { describe, expect, it } from "vitest";

import {
  TaskProductionTimeSchema,
  type ItemEconomicsStatus,
  type TaskProductionTime,
} from "../types";
import { toProductionTimeViewModel } from "./production-time-dto";

const NOW_MS = Date.parse("2026-08-17T09:22:00+00:00");

function typical(seconds: number | null) {
  return {
    typical_worker_seconds: seconds,
    sample_count: 23,
    method: "median_completed_section_totals",
    window_days: 90,
    min_sample_size: 5,
  };
}

function makeDto(
  overrides: Partial<TaskProductionTime> = {},
): TaskProductionTime {
  return {
    task_id: "tsk_example",
    status: "ok",
    item_binding: "bound",
    allocation_method: "static_proportional_section_v1",
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
        section_name_snapshot: "Upholstery Installation",
        order_list: 7,
        state: "working",
        state_entered_at: "2026-08-17T09:12:00+00:00",
        worked_seconds: 1_500,
        step_count: 2,
        allowance_seconds: 3_600,
        left_seconds: 2_100,
        share_state: "on_track",
        typical: typical(3_600),
      },
      {
        working_section_id: "wsec_deleted",
        section_name: null,
        section_name_snapshot: "Legacy Glazing",
        order_list: null,
        state: "working",
        state_entered_at: null,
        worked_seconds: 600,
        step_count: 1,
        allowance_seconds: -300,
        left_seconds: -900,
        share_state: "over_share",
        typical: null,
      },
      {
        working_section_id: "wsec_excluded",
        section_name: "QC",
        section_name_snapshot: "QC",
        order_list: 8,
        state: "cancelled",
        state_entered_at: null,
        worked_seconds: 0,
        step_count: 1,
        allowance_seconds: null,
        left_seconds: null,
        share_state: "excluded",
        typical: typical(900),
      },
    ],
    ...overrides,
  };
}

describe("TaskProductionTimeSchema", () => {
  it("parses the handoff payload without coercing decimal strings", () => {
    const parsed = TaskProductionTimeSchema.parse(makeDto());

    expect(parsed.budget.allowed_worker_minutes).toBe("195.00");
    expect(typeof parsed.budget.allowed_worker_minutes).toBe("string");
    expect(parsed.sections[1]?.allowance_seconds).toBe(-300);
    expect(parsed.sections[1]?.section_name).toBeNull();
    expect(parsed.sections[1]?.typical).toBeNull();
  });
});

describe("toProductionTimeViewModel", () => {
  it("maps sections 1:1 in payload order and preserves a reassignment", () => {
    const viewModel = toProductionTimeViewModel(makeDto(), NOW_MS);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows.map((row) => row.label)).toEqual([
      "Upholstery Installation",
      "Legacy Glazing",
      "QC",
    ]);
    expect(viewModel.card.rows[0]?.stepCount).toBe(2);
    expect(viewModel.card.rows).toHaveLength(3);
  });

  it("anchors live time to state_entered_at and advances all card geometry", () => {
    const viewModel = toProductionTimeViewModel(makeDto(), NOW_MS);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows[0]).toMatchObject({
      workedSeconds: 2_100,
      workedLabel: "35m",
    });
    expect(viewModel.card.headline.workedLabel).toBe("2h 50m");
    expect(viewModel.card.headline.remainingLabel).toBe("25m left");
    expect(viewModel.card.segments[0]?.widthPercent).toBeCloseTo(
      (2_100 / 11_700) * 100,
    );
  });

  it("does not tick from fetch time when state_entered_at is missing or invalid", () => {
    const missing = toProductionTimeViewModel(makeDto(), NOW_MS);
    const invalid = toProductionTimeViewModel(
      makeDto({
        sections: makeDto().sections.map((section, index) =>
          index === 0
            ? { ...section, state_entered_at: "not-a-date" }
            : section,
        ),
      }),
      NOW_MS,
    );

    expect(missing.kind).toBe("budget");
    expect(invalid.kind).toBe("budget");
    if (missing.kind !== "budget" || invalid.kind !== "budget") return;

    expect(missing.card.rows[1]?.workedSeconds).toBe(600);
    expect(invalid.card.rows[0]?.workedSeconds).toBe(1_500);
    expect(Number.isNaN(invalid.card.rows[0]?.workedSeconds)).toBe(false);
  });

  it("copies share_state through even when client-side arithmetic suggests otherwise", () => {
    const dto = makeDto({
      sections: [
        {
          ...makeDto().sections[0]!,
          state_entered_at: null,
          worked_seconds: 7_200,
          allowance_seconds: 3_600,
          share_state: "on_track",
        },
      ],
    });
    const viewModel = toProductionTimeViewModel(dto, NOW_MS);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows[0]?.detail?.verdictTone).toBe("on_track");
    expect(viewModel.card.rows[0]?.detail?.verdictLabel).toBe("On track");
  });

  it("guards a non-positive allowance and uses the server over-share verdict", () => {
    const viewModel = toProductionTimeViewModel(makeDto(), NOW_MS);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows[1]?.detail).toEqual({
      progressPercent: 100,
      typicalMarkerPercent: null,
      verdictLabel: "Over share",
      verdictTone: "over_share",
    });
  });

  it("uses snapshot, current and unnamed labels in that order", () => {
    const base = makeDto().sections[0]!;
    const dto = makeDto({
      sections: [
        base,
        {
          ...base,
          working_section_id: "wsec_current",
          section_name_snapshot: null,
          section_name: "Current name",
        },
        {
          ...base,
          working_section_id: "wsec_unnamed",
          section_name_snapshot: null,
          section_name: null,
        },
      ],
    });
    const viewModel = toProductionTimeViewModel(dto, NOW_MS);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.rows.map((row) => row.label)).toEqual([
      "Upholstery Installation",
      "Current name",
      "Unnamed section",
    ]);
  });

  it("sums degraded worked time from sections and still applies the live tick", () => {
    const dto = makeDto({
      status: "not_evaluated",
      budget: {
        allowed_worker_minutes: null,
        actual_worker_seconds: null,
        actual_worker_minutes: null,
        remaining_worker_minutes: null,
        percent_consumed: null,
      },
      sections: makeDto().sections.map((section) => ({
        ...section,
        allowance_seconds: null,
        left_seconds: null,
        share_state: "no_budget" as const,
      })),
    });
    const viewModel = toProductionTimeViewModel(dto, NOW_MS);

    expect(viewModel.kind).toBe("no_budget");
    if (viewModel.kind !== "no_budget") return;

    expect(viewModel.card.workedLabel).toBe("45m");
    expect(viewModel.card.cta).toBeNull();
    expect(viewModel.card.rows[0]?.typicalComparisonLabel).toBe(
      "of typically 1h 0m",
    );
    expect(viewModel.card.rows.every((row) => row.detail === null)).toBe(true);
  });

  it.each<readonly [NoBudgetCaseStatus, string]>([
    ["item_missing_major_category", "This item has no category"],
    ["not_configured_no_cost_group", "The workshop is not set up for this category"],
    ["not_configured_ambiguous_cost_group", "More than one cost group matches"],
    ["not_configured_no_basis_version", "The cost group has no cost basis"],
    ["not_configured_no_cost_model_version", "No cost model is set"],
    ["item_unvalued", "This item has no price"],
    ["item_missing_expected_price", "The price has no expected sale amount"],
    ["item_missing_purchase_cost", "The item has no purchase cost"],
    ["currency_mismatch", "Prices are in different currencies"],
    ["not_evaluated", "Budget not calculated yet"],
  ])("maps %s to its exact reason title", (status, title) => {
    const viewModel = toProductionTimeViewModel(
      makeDto({ status }),
      NOW_MS,
    );

    expect(viewModel.kind).toBe("no_budget");
    if (viewModel.kind !== "no_budget") return;
    expect(viewModel.card.reasonTitle).toBe(title);
    expect(viewModel.card.rawStatus).toBe(status);
  });

  it("renders infeasible as a zero-budget overrun", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        status: "infeasible",
        budget: {
          allowed_worker_minutes: "0.00",
          actual_worker_seconds: 10_500,
          actual_worker_minutes: "175.00",
          remaining_worker_minutes: "-175.00",
          percent_consumed: null,
        },
        sections: makeDto().sections.map((section) => ({
          ...section,
          state: "completed",
          state_entered_at: null,
        })),
      }),
      NOW_MS,
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.headline).toMatchObject({
      workedLabel: "2h 55m",
      budgetLabel: "of 0m",
      remainingLabel: "2h 55m over",
      isOverBudget: true,
    });
    expect(viewModel.card.remainderPercent).toBe(0);
  });

  it("prefers final headline values and freezes their tick", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        final: {
          actual_worker_minutes: "160.00",
          variance_worker_minutes: "35.00",
          percent_consumed: "82.05",
          task_state_snapshot: "completed",
          computed_at: "2026-08-17T18:03:00+00:00",
        },
      }),
      NOW_MS,
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.headline).toMatchObject({
      workedLabel: "2h 40m",
      remainingLabel: "35m left",
      isFinal: true,
    });
  });

  it.each(["detached", "mismatched"] as const)(
    "returns unavailable for a %s item binding",
    (itemBinding) => {
      expect(
        toProductionTimeViewModel(
          makeDto({ item_binding: itemBinding }),
          NOW_MS,
        ),
      ).toEqual({ kind: "unavailable", reason: itemBinding });
    },
  );

  describe("allowance label", () => {
    // A manager has to be able to see a stage is tight *before* anyone starts
    // it. The allowance is in the payload for every section; it was rendered
    // for none of them.
    it("names the allowance on a pending row, not only the working one", () => {
      const base = makeDto().sections[0]!;
      const viewModel = toProductionTimeViewModel(
        makeDto({
          sections: [
            { ...base, working_section_id: "wsec-working", state: "working" },
            {
              ...base,
              working_section_id: "wsec-pending",
              state: "pending",
              state_entered_at: null,
              worked_seconds: 0,
              allowance_seconds: 1_562,
              typical: typical(2_790),
            },
          ],
        }),
        NOW_MS,
      );

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.rows[1]?.allowanceLabel).toBe("26m allowed");
      expect(viewModel.card.rows[1]?.typicalLabel).toBe("typical 46m");
    });

    it("renders no allowance rather than '0m allowed' when there is none", () => {
      // A non-positive allowance is a real state and "0m allowed" would read as
      // a budget of zero rather than the absence of one.
      const base = makeDto().sections[0]!;
      const viewModel = toProductionTimeViewModel(
        makeDto({
          sections: [
            { ...base, allowance_seconds: 0 },
            {
              ...base,
              working_section_id: "wsec-null",
              allowance_seconds: null,
            },
          ],
        }),
        NOW_MS,
      );

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.rows[0]?.allowanceLabel).toBeNull();
      expect(viewModel.card.rows[1]?.allowanceLabel).toBeNull();
    });
  });
});

type NoBudgetCaseStatus = Exclude<
  ItemEconomicsStatus,
  "ok" | "infeasible"
>;
