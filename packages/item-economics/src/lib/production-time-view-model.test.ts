import { describe, expect, it } from "vitest";

import {
  formatPassCount,
  buildOutlook,
  buildRowDetail,
  buildSegments,
  formatWorkSeconds,
  humanizeSectionState,
  selectVisibleRows,
  stateToTone,
  type ProductionTimeRowViewModel,
} from "./production-time-view-model";

function row(
  overrides: Partial<ProductionTimeRowViewModel> & { key: string },
): ProductionTimeRowViewModel {
  return {
    label: "Sanding",
    tone: "completed",
    stateLabel: "Completed",
    workedLabel: "50m",
    workedSeconds: 3000,
    stepCount: 1,
    isActive: false,
    isExcluded: false,
    allowanceLabel: null,
    pressureLabel: null,
    typicalLabel: null,
    typicalComparisonLabel: null,
    detail: null,
    ...overrides,
  };
}

const STEP_STATE_CASES = [
  ["pending", "pending", "Pending"],
  ["working", "working", "Working"],
  ["paused", "paused", "Paused"],
  ["blocked", "blocked", "Blocked"],
  ["completed", "completed", "Completed"],
  ["failed", "blocked", "Failed"],
  ["skipped", "pending", "Skipped"],
  ["cancelled", "pending", "Cancelled"],
  ["ended_shift", "paused", "Ended shift"],
] as const;

describe("formatWorkSeconds", () => {
  it("drops the hour component below an hour", () => {
    expect(formatWorkSeconds(3000)).toBe("50m");
  });

  it("keeps a zero minute component above an hour", () => {
    expect(formatWorkSeconds(3600)).toBe("1h 0m");
    expect(formatWorkSeconds(10_500)).toBe("2h 55m");
  });

  it("never renders a negative duration", () => {
    expect(formatWorkSeconds(-600)).toBe("0m");
    expect(formatWorkSeconds(Number.NaN)).toBe("0m");
  });
});

describe("buildSegments", () => {
  it("divides the budget by worked time and hatches the remainder", () => {
    const { segments, remainderPercent } = buildSegments(
      [
        row({ key: "a", workedSeconds: 4200 }),
        row({ key: "b", workedSeconds: 3000 }),
        row({ key: "c", workedSeconds: 900, tone: "paused" }),
        row({ key: "d", workedSeconds: 2400, tone: "working" }),
      ],
      11_700,
    );

    expect(segments).toHaveLength(4);
    expect(segments[0].widthPercent).toBeCloseTo(35.9, 1);
    expect(segments[3].tone).toBe("working");
    // 20m of a 3h 15m budget still unspent.
    expect(remainderPercent).toBeCloseTo(10.26, 1);
  });

  it("normalises against total worked once the budget is exceeded", () => {
    const { segments, remainderPercent } = buildSegments(
      [
        row({ key: "a", workedSeconds: 6000 }),
        row({ key: "b", workedSeconds: 6000 }),
      ],
      6000,
    );

    expect(remainderPercent).toBe(0);
    expect(segments[0].widthPercent).toBeCloseTo(50, 5);
    expect(segments[1].widthPercent).toBeCloseTo(50, 5);
  });

  it("skips zero-width segments so no stray sliver is drawn", () => {
    const { segments } = buildSegments(
      [
        row({ key: "a", workedSeconds: 3000 }),
        row({ key: "pending", workedSeconds: 0, tone: "pending" }),
      ],
      6000,
    );

    expect(segments.map((segment) => segment.key)).toEqual(["a"]);
  });

  it("draws nothing when there is neither a budget nor worked time", () => {
    expect(buildSegments([], 0)).toEqual({ segments: [], remainderPercent: 0 });
  });
});

describe("buildRowDetail", () => {
  it("fills proportionally against the allowance", () => {
    const detail = buildRowDetail(2400, 3900, "on_track");

    expect(detail.progressPercent).toBeCloseTo(61.5, 1);
    expect(detail.verdictLabel).toBe("On track");
  });

  it("draws a full bar without dividing when the allowance is not positive", () => {
    for (const allowance of [0, -600, null]) {
      const detail = buildRowDetail(3000, allowance, "over_share");

      expect(detail.progressPercent).toBe(100);
    }
  });

  it("clamps a section that worked past its whole slice", () => {
    expect(buildRowDetail(9000, 3600, "over_share").progressPercent).toBe(
      100,
    );
  });

  it("takes the verdict from share_state rather than the arithmetic", () => {
    // Worked is comfortably under the allowance, but the server says the
    // section overran — across both of its passes. The server wins.
    expect(buildRowDetail(600, 3600, "over_share").verdictTone).toBe(
      "over_share",
    );
    expect(buildRowDetail(9000, 3600, "on_track").verdictTone).toBe(
      "on_track",
    );
  });
});

describe("buildOutlook", () => {
  // The payload that motivated the line: three completed sections, two of them
  // over their slice by more than the third came in under, leaving 27m of pot
  // against 43m of still-committed work.
  const REAL_PAYLOAD_SECTIONS = [
    { state: "completed", leftSeconds: -4003 },
    { state: "completed", leftSeconds: 4573 },
    { state: "completed", leftSeconds: -1519 },
    { state: "pending", leftSeconds: 2210 },
    { state: "pending", leftSeconds: 409 },
  ];

  it("names the gap between the unfinished targets and the pot", () => {
    const outlook = buildOutlook(REAL_PAYLOAD_SECTIONS, 1670);

    expect(outlook).toEqual({
      label: "Remaining work is budgeted at 43m — projected ~15m over.",
      remainingCommitmentSeconds: 2619,
      projectedOverrunSeconds: 949,
    });
  });

  it("counts only the sections that can still consume the pot", () => {
    // The completed overruns are already inside the served remaining figure;
    // counting them again would double the gap.
    const outlook = buildOutlook(
      [
        { state: "completed", leftSeconds: -4003 },
        { state: "skipped", leftSeconds: 600 },
        { state: "cancelled", leftSeconds: 600 },
        { state: "failed", leftSeconds: 600 },
        { state: "pending", leftSeconds: 2210 },
      ],
      1200,
    );

    expect(outlook?.remainingCommitmentSeconds).toBe(2210);
  });

  it("lets an unfinished section that is already over contribute nothing", () => {
    // How much further it will overrun is unknowable; a negative would quietly
    // cancel out another stage's real remaining work.
    const outlook = buildOutlook(
      [
        { state: "working", leftSeconds: -900 },
        { state: "pending", leftSeconds: 2400 },
      ],
      1200,
    );

    expect(outlook?.remainingCommitmentSeconds).toBe(2400);
    expect(outlook?.projectedOverrunSeconds).toBe(1200);
  });

  it("ignores a section with no slice at all", () => {
    const outlook = buildOutlook(
      [
        { state: "cancelled", leftSeconds: null },
        { state: "pending", leftSeconds: 2400 },
      ],
      1200,
    );

    expect(outlook?.remainingCommitmentSeconds).toBe(2400);
  });

  it("says nothing while the remaining work still fits", () => {
    expect(
      buildOutlook([{ state: "pending", leftSeconds: 1200 }], 3600),
    ).toBeNull();
  });

  it("stays quiet under a minute, which would read as '0m over'", () => {
    expect(
      buildOutlook([{ state: "pending", leftSeconds: 1259 }], 1200),
    ).toBeNull();
    expect(
      buildOutlook([{ state: "pending", leftSeconds: 1260 }], 1200),
    ).not.toBeNull();
  });

  it("says nothing when no work is left to project", () => {
    expect(
      buildOutlook([{ state: "completed", leftSeconds: -600 }], 1200),
    ).toBeNull();
    expect(buildOutlook([], 1200)).toBeNull();
  });

  it("says nothing without a remaining figure to compare against", () => {
    expect(
      buildOutlook([{ state: "pending", leftSeconds: 2400 }], null),
    ).toBeNull();
  });

  it("projects past an overrun that has already happened", () => {
    // The headline already says "10m over"; the forecast is the bigger number.
    const outlook = buildOutlook([{ state: "pending", leftSeconds: 2619 }], -600);

    expect(outlook?.projectedOverrunSeconds).toBe(3219);
    expect(outlook?.label).toBe(
      "Remaining work is budgeted at 43m — projected ~53m over.",
    );
  });
});

describe("formatPassCount", () => {
  it("says nothing for the ordinary single-pass section", () => {
    expect(formatPassCount(1)).toBeNull();
    expect(formatPassCount(0)).toBeNull();
  });

  it("counts the passes of a reassigned section", () => {
    expect(formatPassCount(2)).toBe("2 passes");
    expect(formatPassCount(3)).toBe("3 passes");
  });
});

describe("selectVisibleRows", () => {
  const nine = Array.from({ length: 9 }, (_value, index) =>
    row({ key: `row-${index}`, isActive: index === 7 }),
  );

  it("keeps every row when the pipeline is short", () => {
    const four = nine.slice(0, 4);
    expect(selectVisibleRows(four, false)).toHaveLength(4);
  });

  it("keeps the active row visible while collapsed", () => {
    const visible = selectVisibleRows(nine, false);

    expect(visible.map((item) => item.key)).toEqual([
      "row-0",
      "row-1",
      "row-2",
      "row-3",
      "row-7",
    ]);
  });

  it("preserves payload order and never sorts", () => {
    expect(selectVisibleRows(nine, true).map((item) => item.key)).toEqual(
      nine.map((item) => item.key),
    );
  });
});

describe("stateToTone", () => {
  it.each(STEP_STATE_CASES)(
    "maps %s to the exact %s tone",
    (state, tone) => {
      expect(stateToTone(state)).toBe(tone);
    },
  );

  it("degrades an unknown state to a neutral row", () => {
    expect(stateToTone("something_new")).toBe("pending");
    expect(stateToTone(null)).toBe("pending");
  });
});

describe("humanizeSectionState", () => {
  it.each(STEP_STATE_CASES)(
    "humanizes %s as %s",
    (state, _tone, label) => {
      expect(humanizeSectionState(state)).toBe(label);
    },
  );

  it("keeps an absent state empty", () => {
    expect(humanizeSectionState(null)).toBe("");
  });
});
