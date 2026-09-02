import { describe, expect, it } from "vitest";

import {
  TaskProductionTimeSchema,
  type ItemEconomicsStatus,
  type TaskProductionTime,
} from "../types";
import { toProductionTimeViewModel } from "./production-time-dto";

/**
 * `projectedSeconds` defaults to the raw median, which is what the backend
 * serves at quantity 1. Pass it explicitly to model a multi-unit task, or
 * `undefined` via `typicalWithoutProjection` for a pre-release backend.
 */
function typical(seconds: number | null, projectedSeconds = seconds) {
  return {
    typical_worker_seconds: seconds,
    typical_unit_worker_seconds: seconds === null ? null : String(seconds),
    projected_typical_worker_seconds: projectedSeconds,
    sample_count: 23,
    typical_basis: "item_narrowed" as const,
    narrowed_sample_count: 23,
    section_sample_count: 76,
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
    allocation_method: "static_proportional_section_v2",
    pressure_ratio: "1.00",
    pressure_method: "open_share_proportional_v1",
    typical_resolution: {
      task_typical_basis: "item_narrowed_uniform",
      reconciliation_method: "uniform_basis_v1",
      comparability_profile: "primary_item_category_v1",
      applied_filter: { item_category_ids: ["icat_chair"] },
      participating_section_count: 2,
      sections_by_basis: {
        item_narrowed: 2,
        section_wide: 0,
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
        section_name_snapshot: "Upholstery Installation",
        order_list: 7,
        state: "working",
        state_entered_at: "2026-08-17T09:12:00+00:00",
        worked_seconds: 1_500,
        step_count: 2,
        allowance_seconds: 3_600,
        pressure_share_seconds: 3_000,
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
        pressure_share_seconds: 0,
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
        pressure_share_seconds: null,
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
    expect(parsed.sections[0]?.pressure_share_seconds).toBe(3_000);
  });
});

describe("toProductionTimeViewModel", () => {
  it("maps sections 1:1 in payload order and preserves a reassignment", () => {
    const viewModel = toProductionTimeViewModel(makeDto());

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows.map((row) => row.label)).toEqual([
      "Upholstery Installation",
      "Legacy Glazing",
      "QC",
    ]);
    expect(viewModel.card.rows[0]?.stepCount).toBe(2);
    expect(viewModel.card.rows).toHaveLength(3);
    expect(viewModel.card.rows[0]?.allowanceLabel).toBe("1h 0m assigned");
    expect(viewModel.card.rows[0]?.pressureLabel).toBe("50m pressure");
    expect(viewModel.card.rows[0]?.detail?.positionLabel).toBe("25m left");
    expect(viewModel.card.rows[0]?.activeMetrics?.[1].valueLabel).toBe("50m");
  });

  it("caps an improving pressure target at the original assignment", () => {
    const base = makeDto().sections[0]!;
    const viewModel = toProductionTimeViewModel(
      makeDto({
        sections: [{ ...base, pressure_share_seconds: 7_200 }],
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.rows[0]?.activeMetrics?.[1].valueLabel).toBe("1h 0m");
    expect(viewModel.card.rows[0]?.detail?.positionLabel).toBe("35m left");
  });

  it("shows the served assigned-budget overrun when pressure is exhausted", () => {
    const base = makeDto().sections[0]!;
    const viewModel = toProductionTimeViewModel(
      makeDto({
        sections: [
          {
            ...base,
            worked_seconds: 2_729,
            allowance_seconds: 1_187,
            pressure_share_seconds: 0,
            left_seconds: -1_542,
            share_state: "over_share",
          },
        ],
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.rows[0]?.activeMetrics?.[1]).toEqual({
      label: "Over budget",
      valueLabel: "25m",
      supportingLabel: null,
      tone: "danger",
    });
    expect(viewModel.card.rows[0]?.detail).toMatchObject({
      positionLabel: "25m over",
      positionTone: "over",
      progressPercent: 100,
      verdictTone: "over_share",
    });
  });

  it.each(["working", "paused", "ended_shift"] as const)(
    "keeps %s sections expanded with active pressure metrics",
    (state) => {
      const base = makeDto().sections[0]!;
      const viewModel = toProductionTimeViewModel(
        makeDto({ sections: [{ ...base, state }] }),
      );

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.rows[0]).toMatchObject({
        isActive: true,
        isTerminal: false,
      });
      expect(viewModel.card.rows[0]?.detail).not.toBeNull();
      expect(viewModel.card.rows[0]?.activeMetrics).not.toBeNull();
    },
  );

  it.each(["completed", "skipped", "failed", "cancelled"] as const)(
    "renders %s sections as terminal performance rows",
    (state) => {
      const base = makeDto().sections[0]!;
      const viewModel = toProductionTimeViewModel(
        makeDto({ sections: [{ ...base, state }] }),
      );

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.rows[0]).toMatchObject({
        isActive: false,
        isTerminal: true,
      });
      expect(viewModel.card.rows[0]?.terminalMetrics).not.toBeNull();
      expect(viewModel.card.rows[0]?.detail).toBeNull();
    },
  );

  it("renders the served figures verbatim — the clock is the backend's", () => {
    // Since the 2026-08-22 go-live the payload already contains the open
    // working interval. Any client-elapsed addition here is a double count.
    const viewModel = toProductionTimeViewModel(makeDto());

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows[0]).toMatchObject({
      workedSeconds: 1_500,
      workedLabel: "25m",
    });
    expect(viewModel.card.headline.workedLabel).toBe("2h 40m");
    expect(viewModel.card.headline.remainingLabel).toBe("35m left");
    expect(viewModel.card.segments[0]?.widthPercent).toBeCloseTo(
      (1_500 / 11_700) * 100,
    );
  });

  it("gives state_entered_at no influence over any figure", () => {
    // Two payloads that differ only in when the open interval started must
    // render identically — the served worked_seconds already contains it.
    const base = toProductionTimeViewModel(makeDto());
    const shifted = toProductionTimeViewModel(
      makeDto({
        sections: makeDto().sections.map((section, index) =>
          index === 0
            ? { ...section, state_entered_at: "2020-01-01T00:00:00+00:00" }
            : section,
        ),
      }),
    );

    expect(shifted).toEqual(base);
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
    const viewModel = toProductionTimeViewModel(dto);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows[0]?.detail?.verdictTone).toBe("on_track");
  });

  it("guards a non-positive allowance and uses the server over-share verdict", () => {
    const viewModel = toProductionTimeViewModel(makeDto());

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;

    expect(viewModel.card.rows[1]?.detail).toEqual({
      progressPercent: 100,
      positionLabel: "15m over",
      positionTone: "over",
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
    const viewModel = toProductionTimeViewModel(dto);

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.rows.map((row) => row.label)).toEqual([
      "Upholstery Installation",
      "Current name",
      "Unnamed section",
    ]);
  });

  it("sums degraded worked time from the served sections", () => {
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
    const viewModel = toProductionTimeViewModel(dto);

    expect(viewModel.kind).toBe("no_budget");
    if (viewModel.kind !== "no_budget") return;

    expect(viewModel.card.workedLabel).toBe("35m");
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
    );

    expect(viewModel.kind).toBe("no_budget");
    if (viewModel.kind !== "no_budget") return;
    expect(viewModel.card.reasonTitle).toBe(title);
    expect(viewModel.card.rawStatus).toBe(status);
  });

  it("renders infeasible as an overrun against no stated budget", () => {
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
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.headline).toMatchObject({
      workedLabel: "2h 55m",
      // A pot of exactly zero is still no pot to quote.
      budgetLabel: null,
      remainingLabel: "2h 55m over",
      isOverBudget: true,
    });
    expect(viewModel.card.remainderPercent).toBe(0);
  });

  it("explains an infeasible task with its served negative pot", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        status: "infeasible",
        budget: {
          allowed_worker_minutes: "-38.40",
          actual_worker_seconds: 4_076,
          actual_worker_minutes: "67.93",
          remaining_worker_minutes: "-106.33",
          percent_consumed: null,
          production_budget_minor: -50_000,
          consumed_cost_minor: 88_456,
          variance_cost_minor: -138_456,
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.infeasibleNotice?.title).toBe(
      "No time budget to allocate",
    );
    expect(
      viewModel.card.infeasibleNotice?.body
        .map((segment) => segment.text)
        .join(""),
    ).toBe(
      "Costs already exceed the sale price by 500 kr (about 38m of work), so there is nothing left for labour.",
    );
    expect(
      viewModel.card.infeasibleNotice?.body
        .filter((segment) => segment.emphasis)
        .map((segment) => segment.text),
    ).toEqual(["500 kr", "38m"]);
  });

  it("names the shortfall in time alone for a role served no money", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        status: "infeasible",
        budget: {
          ...makeDto().budget,
          allowed_worker_minutes: "-38.40",
          remaining_worker_minutes: "-106.33",
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    // A worker or seller still gets the figure that explains the card, just in
    // the unit their session is allowed to see.
    expect(
      viewModel.card.infeasibleNotice?.body
        .map((segment) => segment.text)
        .join(""),
    ).toBe(
      "Costs already exceed the sale price by about 38m of work, so there is nothing left for labour.",
    );
  });

  it("names no figure at all when the pot landed on exactly zero", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        status: "infeasible",
        budget: {
          ...makeDto().budget,
          allowed_worker_minutes: "0.00",
          remaining_worker_minutes: "-160.00",
          production_budget_minor: 0,
          consumed_cost_minor: 208_320,
          variance_cost_minor: -208_320,
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(
      viewModel.card.infeasibleNotice?.body
        .map((segment) => segment.text)
        .join(""),
    ).toBe(
      "Costs already take up the whole sale price, so there is nothing left for labour.",
    );
    expect(
      viewModel.card.infeasibleNotice?.body.some((segment) => segment.emphasis),
    ).toBe(false);
  });

  it("drops the budget term from both units on an infeasible task", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        status: "infeasible",
        budget: {
          allowed_worker_minutes: "-38.40",
          actual_worker_seconds: 4_076,
          actual_worker_minutes: "67.93",
          remaining_worker_minutes: "-106.33",
          percent_consumed: null,
          production_budget_minor: -50_000,
          consumed_cost_minor: 88_455,
          variance_cost_minor: -138_455,
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    // Neither "of 0m" nor "of −500 kr" — the banner carries the shortfall, and
    // a quoted pot beside the worked figure reads as a subtraction.
    expect(viewModel.card.headline.budgetLabel).toBeNull();
    expect(viewModel.card.headline.cost?.budgetLabel).toBeNull();
    // What was spent and how far past the line it puts the item both stay.
    expect(viewModel.card.headline.workedLabel).toBe("1h 7m");
    expect(viewModel.card.headline.remainingLabel).toBe("1h 46m over");
    expect(viewModel.card.headline.cost).toMatchObject({
      workedLabel: "885\u00a0kr",
      remainingLabel: "1\u00a0385\u00a0kr over",
      isOverBudget: true,
    });
  });

  it("keeps the budget term on a feasible task, however tight", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        budget: {
          ...makeDto().budget,
          production_budget_minor: 253_900,
          consumed_cost_minor: 227_850,
          variance_cost_minor: 26_050,
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.headline.budgetLabel).toBe("of 3h 15m");
    expect(viewModel.card.headline.cost?.budgetLabel).toBe("of 2\u00a0539\u00a0kr");
  });

  it("removes the cost tap entirely for a role served no money", () => {
    const workerBudget = makeDto().budget;
    const viewModel = toProductionTimeViewModel(
      makeDto({
        status: "infeasible",
        budget: {
          ...workerBudget,
          allowed_worker_minutes: "-38.40",
          remaining_worker_minutes: "-106.33",
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.headline.cost).toBeNull();
  });

  it("leaves a feasible task unexplained even when money is served", () => {
    const viewModel = toProductionTimeViewModel(
      makeDto({
        budget: {
          ...makeDto().budget,
          production_budget_minor: 254_000,
          consumed_cost_minor: 208_320,
          variance_cost_minor: 45_680,
        },
      }),
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.infeasibleNotice).toBeNull();
  });

  it("keeps the money keys optional, as worker and seller bodies omit them", () => {
    const parsed = TaskProductionTimeSchema.parse(makeDto());

    expect(parsed.budget.production_budget_minor).toBeUndefined();
    expect(
      TaskProductionTimeSchema.parse(
        makeDto({
          budget: {
            ...makeDto().budget,
            production_budget_minor: null,
            consumed_cost_minor: null,
            variance_cost_minor: null,
          },
        }),
      ).budget.production_budget_minor,
    ).toBeNull();
  });

  it("prefers final headline values over the live budget block", () => {
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
    );

    expect(viewModel.kind).toBe("budget");
    if (viewModel.kind !== "budget") return;
    expect(viewModel.card.headline).toMatchObject({
      workedLabel: "2h 40m",
      remainingLabel: "35m left",
      isFinal: true,
    });
  });

  describe("projected overrun", () => {
    // A real payload (tsk_01KXGHT2BP0JXVHW065KSJSRVZ, 2026-08-22): every
    // remaining stage on track and the task still inside its budget, yet the
    // 43m still committed no longer fits the 27m of pot left.
    function staticSplitDto(): TaskProductionTime {
      const base = makeDto().sections[0];

      return makeDto({
        budget: {
          allowed_worker_minutes: "276.48",
          actual_worker_seconds: 14_919,
          actual_worker_minutes: "248.65",
          remaining_worker_minutes: "27.83",
          percent_consumed: "89.93",
        },
        sections: [
          {
            ...base,
            working_section_id: "wsec_cleaning",
            state: "completed",
            worked_seconds: 6_961,
            allowance_seconds: 2_958,
            left_seconds: -4_003,
            share_state: "over_share",
          },
          {
            ...base,
            working_section_id: "wsec_structural",
            state: "completed",
            worked_seconds: 4_977,
            allowance_seconds: 9_550,
            left_seconds: 4_573,
            share_state: "on_track",
          },
          {
            ...base,
            working_section_id: "wsec_weaving",
            state: "pending",
            worked_seconds: 0,
            allowance_seconds: 2_210,
            left_seconds: 2_210,
            share_state: "on_track",
          },
          {
            ...base,
            working_section_id: "wsec_photography",
            state: "pending",
            worked_seconds: 0,
            allowance_seconds: 409,
            left_seconds: 409,
            share_state: "on_track",
          },
        ],
      });
    }

    it("warns when the unfinished slices no longer fit the remaining pot", () => {
      const viewModel = toProductionTimeViewModel(staticSplitDto());

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;

      expect(viewModel.card.outlook?.label).toBe(
        "~43m expected left · ~15m over budget",
      );
      // The served figures are untouched by the projection.
      expect(viewModel.card.headline.remainingLabel).toBe("27m left");
      expect(viewModel.card.headline.isOverBudget).toBe(false);
      expect(viewModel.card.rows[2]?.allowanceLabel).toBe("36m assigned");
    });

    it("says nothing once the task is closed", () => {
      const viewModel = toProductionTimeViewModel({
        ...staticSplitDto(),
        final: {
          actual_worker_minutes: "248.65",
          variance_worker_minutes: "-27.83",
          percent_consumed: "89.93",
          task_state_snapshot: "completed",
          computed_at: "2026-08-22T18:03:00+00:00",
        },
      });

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.outlook).toBeNull();
    });

    it("says nothing on an ordinary task whose remaining work fits", () => {
      const viewModel = toProductionTimeViewModel(makeDto());

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.outlook).toBeNull();
    });
  });

  it.each(["detached", "mismatched"] as const)(
    "returns unavailable for a %s item binding",
    (itemBinding) => {
      expect(
        toProductionTimeViewModel(
          makeDto({ item_binding: itemBinding }),
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
      );

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.rows[1]?.allowanceLabel).toBe("26m assigned");
      // Per piece, and seconds-resolution: 2790s is 46m30s, which the
      // whole-order formatter would have floored to a flat "46m".
      expect(viewModel.card.rows[1]?.typicalLabel).toBe("typical 46m 30s/pc");
      expect(
        viewModel.card.rows[1]?.activeMetrics?.map(
          ({ label, valueLabel }) => `${label}:${valueLabel}`,
        ),
      ).toEqual(["Budget:26m", "Pressure:26m", "Typical:46m 30s"]);
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
      );

      expect(viewModel.kind).toBe("budget");
      if (viewModel.kind !== "budget") return;
      expect(viewModel.card.rows[0]?.allowanceLabel).toBeNull();
      expect(viewModel.card.rows[1]?.allowanceLabel).toBeNull();
    });
  });

  // Quantity-normalized typicals (handoff 2026-08-29). Everything a row says
  // about "typical" answers how long *this* task should take, so it reads the
  // server's projection. The raw median stays the allowance's reference and is
  // only the fallback for a backend that has not shipped the projection.
  describe("quantity-projected typical", () => {
    function rowsForTypical(block: ReturnType<typeof typical>) {
      const base = makeDto().sections[0]!;
      const viewModel = toProductionTimeViewModel(
        makeDto({
          projection_quantity: 3,
          sections: [{ ...base, typical: block }],
        }),
      );
      if (viewModel.kind !== "budget") {
        throw new Error("expected a budget card");
      }
      return viewModel.card.rows;
    }

    it("displays the per-piece median on the typical label and tile", () => {
      // Raw 600s, unit 140s, quantity 3 -> projection 420s. The row shows the
      // 140s: it is the figure that does not move when the order size does.
      const rows = rowsForTypical({
        ...typical(600, 420),
        typical_unit_worker_seconds: "140",
      });

      expect(rows[0]?.typicalLabel).toBe("typical 2m 20s/pc");
      expect(
        rows[0]?.activeMetrics?.map(
          ({ label, valueLabel, supportingLabel }) =>
            `${label}:${valueLabel}:${supportingLabel}`,
        ),
      ).toContain("Typical:2m 20s:pc");
      expect(rows[0]?.unitTypicalSeconds).toBe(140);
      expect(rows[0]?.projectedTypicalSeconds).toBe(420);
    });

    it("keeps the worked-time comparison whole-order, not per piece", () => {
      // "25m of typically 7m" is a subtraction the reader can actually make.
      // Putting the 2m20s per-piece figure here would not be.
      const rows = rowsForTypical({
        ...typical(600, 420),
        typical_unit_worker_seconds: "140",
      });

      expect(rows[0]?.typicalComparisonLabel).toBe("of typically 7m");
    });

    it("keeps a fractional per-piece median, rounding only at the formatter", () => {
      // The unit field is the one served duration that may be fractional.
      const rows = rowsForTypical({
        ...typical(428, 428),
        typical_unit_worker_seconds: "142.5",
      });

      expect(rows[0]?.unitTypicalSeconds).toBe(142.5);
      expect(rows[0]?.typicalLabel).toBe("typical 2m 23s/pc");
    });

    it("never divides client-side — a multi-unit task with no unit figure shows no typical", () => {
      // `.catch(null)` on the unit field covers a mid-deploy backend. Deriving
      // the per-piece number from the projection is exactly what the handoff
      // rules out, and the server's half-even rounding means the result would
      // not reproduce the projection anyway. No figure beats a wrong one.
      const rows = rowsForTypical({
        ...typical(600),
        typical_unit_worker_seconds: null,
      });

      expect(rows[0]?.typicalLabel).toBeNull();
      expect(rows[0]?.unitTypicalSeconds).toBeNull();
    });

    it("reads the projection as the per-piece figure at quantity 1", () => {
      // Not a derivation: at one unit the two are the same number, so a
      // mid-deploy backend still gets a labelled typical.
      const base = makeDto().sections[0]!;
      const viewModel = toProductionTimeViewModel(
        makeDto({
          projection_quantity: 1,
          sections: [
            {
              ...base,
              typical: {
                ...typical(600),
                typical_unit_worker_seconds: null,
              },
            },
          ],
        }),
      );
      if (viewModel.kind !== "budget") {
        throw new Error("expected a budget card");
      }

      expect(viewModel.card.rows[0]?.typicalLabel).toBe("typical 10m/pc");
    });

    it("keeps the existing insufficient-sample state when both are null", () => {
      const rows = rowsForTypical(typical(null));

      expect(rows[0]?.typicalLabel).toBeNull();
      expect(rows[0]?.typicalComparisonLabel).toBeNull();
    });

    it("defaults projection_quantity to 1 rather than 0 when absent", () => {
      const { projection_quantity: _omitted, ...withoutQuantity } = makeDto();
      const parsed = TaskProductionTimeSchema.parse(withoutQuantity);

      expect(parsed.projection_quantity).toBe(1);
    });
  });

});

type NoBudgetCaseStatus = Exclude<
  ItemEconomicsStatus,
  "ok" | "infeasible"
>;
