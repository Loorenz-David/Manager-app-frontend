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
      facet: null,
      participating_section_count: 2,
      sections_by_basis: {
        item_properties_narrowed: 0,
        item_facet_narrowed: 0,
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
      // Whole minutes, and rounded even in the whole-order reading: a median is
      // the one estimated figure on the card, so 2790s — 46m30s — reads "47m"
      // rather than being floored to "46m" like the exact counts beside it.
      expect(viewModel.card.rows[1]?.typicalLabel).toBe("typical 47m");
      expect(
        viewModel.card.rows[1]?.activeMetrics?.map(
          ({ label, valueLabel }) => `${label}:${valueLabel}`,
        ),
      ).toEqual(["Budget:26m", "Pressure:26m", "Typical:47m"]);
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

  // Quantity-normalized typicals (handoff 2026-08-29). Both readings of
  // "typical" come off the wire: the whole-order one reads the server's
  // projection, the per-piece one the served unit median. Neither is ever
  // computed from the other. The raw median stays the allowance's reference and
  // is only the fallback for a backend that has not shipped the projection.
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

    it("serves each reading its own typical — projection, then unit median", () => {
      // Raw 600s, unit 140s, quantity 3 -> projection 420s. The whole-order
      // reading shows the 420s; the per-piece one the 140s, which is the figure
      // that does not move when the order size does.
      const rows = rowsForTypical({
        ...typical(600, 420),
        typical_unit_worker_seconds: "140",
      });

      expect(rows[0]?.typicalLabel).toBe("typical 7m");
      expect(
        rows[0]?.activeMetrics?.map(
          ({ label, valueLabel }) => `${label}:${valueLabel}`,
        ),
      ).toContain("Typical:7m");

      expect(rows[0]?.unit?.typicalLabel).toBe("typical 2m");
      expect(
        rows[0]?.unit?.activeMetrics?.map(
          ({ label, valueLabel }) => `${label}:${valueLabel}`,
        ),
      ).toContain("Typical:2m");

      expect(rows[0]?.unitTypicalSeconds).toBe(140);
      expect(rows[0]?.projectedTypicalSeconds).toBe(420);
    });

    it("keeps the worked-time comparison in the same unit as the time beside it", () => {
      // "25m of typically 7m" is a subtraction the reader can actually make.
      // Both terms come from one reading, so they can never disagree on unit.
      const rows = rowsForTypical({
        ...typical(600, 420),
        typical_unit_worker_seconds: "140",
      });

      expect(rows[0]?.typicalComparisonLabel).toBe("of typically 7m");
      expect(rows[0]?.unit?.typicalComparisonLabel).toBe("of typically 2m");
    });

    it("keeps a fractional per-piece median, rounding only at the formatter", () => {
      // The unit field is the one served duration that may be fractional. The
      // fraction survives on the view model and is rounded once, for display.
      const rows = rowsForTypical({
        ...typical(428, 428),
        typical_unit_worker_seconds: "142.5",
      });

      expect(rows[0]?.unitTypicalSeconds).toBe(142.5);
      expect(rows[0]?.unit?.typicalLabel).toBe("typical 2m");
    });

    it("never divides client-side — with no unit figure the per-piece reading has no typical", () => {
      // `.catch(null)` on the unit field covers a mid-deploy backend. Deriving
      // the per-piece number from the projection is exactly what the handoff
      // rules out, and the server's half-even rounding means the result would
      // not reproduce the projection anyway. No figure beats a wrong one.
      //
      // This is the ONE structural difference the toggle is allowed to have:
      // the whole-order reading still shows the served projection, so the row
      // loses its typical on the way to per piece rather than everywhere.
      const rows = rowsForTypical({
        ...typical(600),
        typical_unit_worker_seconds: null,
      });

      expect(rows[0]?.unitTypicalSeconds).toBeNull();
      expect(rows[0]?.unit?.typicalLabel).toBeNull();
      expect(rows[0]?.unit?.activeMetrics?.[2]?.valueLabel).toBe("-");

      expect(rows[0]?.typicalLabel).toBe("typical 10m");
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

      expect(viewModel.card.rows[0]?.typicalLabel).toBe("typical 10m");
      // One piece: the two readings are the same numbers, so there is nothing
      // to switch between and no toggle is offered.
      expect(viewModel.card.rows[0]?.unit).toBeNull();
      expect(viewModel.card.unit).toBeNull();
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

// --- The per-piece reading --------------------------------------------------
// Presence and tone are decided once, on the whole-order figures; only
// magnitudes divide. A toggle press restates the card, never restructures it.

describe("per-piece readings", () => {
  function quantityDto(quantity: number): TaskProductionTime {
    return makeDto({ projection_quantity: quantity });
  }

  function budgetCard(dto: TaskProductionTime) {
    const viewModel = toProductionTimeViewModel(dto);
    if (viewModel.kind !== "budget") {
      throw new Error("expected a budget card");
    }
    return viewModel.card;
  }

  it("offers no reading — and so no toggle — on a one-piece order", () => {
    const card = budgetCard(quantityDto(1));

    expect(card.unit).toBeNull();
    for (const row of card.rows) {
      expect(row.unit).toBeNull();
    }
  });

  it.each([0, -2])(
    "degrades an impossible quantity of %i to the whole order",
    (quantity) => {
      // A zero would divide to Infinity, which the formatter renders as a
      // silent "0m" on every figure of the card. It must read as "one unit",
      // never as "no units".
      const card = budgetCard(quantityDto(quantity));

      expect(card.unit).toBeNull();
      expect(card.rows[0]?.unit).toBeNull();
    },
  );

  it("divides every exact count on the headline and the rows", () => {
    const card = budgetCard(quantityDto(4));

    // 9600s worked of 11700s allowed, 2100s left.
    expect(card.headline.workedLabel).toBe("2h 40m");
    expect(card.unit?.headline.workedLabel).toBe("40m");
    expect(card.headline.budgetLabel).toBe("of 3h 15m");
    expect(card.unit?.headline.budgetLabel).toBe("of 49m");
    expect(card.headline.remainingLabel).toBe("35m left");
    expect(card.unit?.headline.remainingLabel).toBe("9m left");

    const active = card.rows[0]!;
    expect(active.unit?.workedLabel).toBe("6m");
    expect(active.unit?.allowanceLabel).toBe("15m assigned");
    expect(active.unit?.pressureLabel).toBe("13m pressure");
    expect(
      active.unit?.activeMetrics?.map(
        ({ label, valueLabel }) => `${label}:${valueLabel}`,
      ),
      // Budget and Pressure divide; Typical does not. The helper serves 3600s
      // as the per-unit median, and it reaches the tile verbatim — that it is
      // now LARGER than the divided budget beside it is the invariant working,
      // not a slip: a typical is read off the wire, never derived.
    ).toEqual(["Budget:15m", "Pressure:13m", "Typical:1h 0m"]);
  });

  it("leaves the bar geometry and every tone exactly where they were", () => {
    const card = budgetCard(quantityDto(4));

    for (const row of card.rows) {
      if (!row.detail || !row.unit?.detail) continue;
      expect(row.unit.detail.progressPercent).toBeCloseTo(
        row.detail.progressPercent,
      );
      expect(row.unit.detail.positionTone).toBe(row.detail.positionTone);
      expect(row.unit.detail.verdictTone).toBe(row.detail.verdictTone);
    }
  });

  it("gives the two readings the same shape, row for row", () => {
    const card = budgetCard(quantityDto(4));

    for (const row of card.rows) {
      expect(row.unit).not.toBeNull();
      expect(row.unit!.terminalMetrics === null).toBe(
        row.terminalMetrics === null,
      );
      expect(row.unit!.activeMetrics === null).toBe(row.activeMetrics === null);
      expect(row.unit!.detail === null).toBe(row.detail === null);
    }
  });

  it("keeps the excluded row's terminal grid, which the whole-order row has too", () => {
    // The terminal guard is `isTerminal && hasBudget` and deliberately does not
    // check `isExcluded`, so a cancelled+excluded row does carry a grid. Both
    // readings must mirror that rather than tidying it into consistency.
    const excluded = budgetCard(quantityDto(4)).rows.find(
      (row) => row.isExcluded,
    )!;

    expect(excluded.terminalMetrics).not.toBeNull();
    expect(excluded.unit?.terminalMetrics).not.toBeNull();
  });

  it("never divides money — only the notice's time figure moves", () => {
    const dto = makeDto({
      projection_quantity: 4,
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
    });
    const card = budgetCard(dto);
    const figures = (notice: typeof card.infeasibleNotice): string[] =>
      (notice?.body ?? [])
        .filter((segment) => segment.emphasis)
        .map(({ text }) => text);

    // The krona shortfall is the ORDER's in both units.
    expect(figures(card.unit?.infeasibleNotice ?? null)[0]).toBe(
      figures(card.infeasibleNotice)[0],
    );
    expect(figures(card.infeasibleNotice)[1]).toBe("38m");
    expect(figures(card.unit?.infeasibleNotice ?? null)[1]).toBe("10m");

    // The headline's money reading has no per-piece sibling at all.
    expect(card.headline.cost).not.toBeNull();
    expect(card.unit?.headline).not.toHaveProperty("cost");
  });

  it("restates the overrun outlook rather than re-gating it", () => {
    const card = budgetCard(quantityDto(4));

    // Presence is decided once, on the whole order.
    expect(card.unit?.outlook === null).toBe(card.outlook === null);
    if (card.outlook && card.unit?.outlook) {
      expect(card.unit.outlook.projectedOverrunSeconds).toBeCloseTo(
        card.outlook.projectedOverrunSeconds / 4,
      );
    }
  });

  it("reads the SERVED per-piece median, not the projection divided", () => {
    // Unit 100s, projection 500s, quantity 3. A division would give 166.7s and
    // render "3m" — the served figure renders "2m", so the two disagree and the
    // assertion can tell them apart.
    const base = makeDto().sections[0]!;
    const card = budgetCard(
      makeDto({
        projection_quantity: 3,
        sections: [
          {
            ...base,
            typical: {
              ...typical(500, 500),
              typical_unit_worker_seconds: "100",
            },
          },
        ],
      }),
    );

    expect(card.rows[0]?.typicalLabel).toBe("typical 8m");
    expect(card.rows[0]?.unit?.typicalLabel).toBe("typical 2m");
  });

  it("divides the degraded card's summed time once, not row by row", () => {
    const card = toProductionTimeViewModel(
      makeDto({ projection_quantity: 4, status: "not_evaluated" }),
    );
    if (card.kind !== "no_budget") {
      throw new Error("expected a no-budget card");
    }

    // 1500 + 600 + 0 = 2100s worked, 525s per piece.
    expect(card.card.workedLabel).toBe("35m");
    expect(card.card.unit?.workedLabel).toBe("9m");
  });
});
