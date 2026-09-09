import { describe, expect, it } from "vitest";

import {
  buildActiveMetrics,
  formatPassCount,
  buildOutlook,
  buildInfeasibleNotice,
  buildOutlookLabel,
  buildRowDetail,
  buildRowUnitReading,
  buildSegments,
  buildTerminalMetrics,
  buildTypicalMetric,
  capPressureSeconds,
  metricValueLabel,
  formatUnitWorkSeconds,
  formatWorkSeconds,
  humanizeSectionState,
  selectAnchorRowIndex,
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
    isTerminal: true,
    isExcluded: false,
    allowanceLabel: null,
    pressureLabel: null,
    typicalLabel: null,
    typicalComparisonLabel: null,
    unitTypicalSeconds: null,
    projectedTypicalSeconds: null,
    terminalMetrics: null,
    activeMetrics: null,
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

describe("formatUnitWorkSeconds", () => {
  it("renders whole minutes, never seconds", () => {
    // Seconds beside the whole-order figures in the same grid read as false
    // precision on a median.
    expect(formatUnitWorkSeconds(140)).toBe("2m");
    expect(formatUnitWorkSeconds(120)).toBe("2m");
    expect(formatUnitWorkSeconds(2790)).toBe("47m");
    expect(formatUnitWorkSeconds(3661)).toBe("1h 1m");
  });

  it("rounds where the whole-order formatter floors", () => {
    // The served unit value is the one fractional figure in the payload;
    // flooring 119.5s to "1m" would discard most of a minute.
    expect(formatWorkSeconds(119.5)).toBe("1m");
    expect(formatUnitWorkSeconds(119.5)).toBe("2m");
    expect(formatUnitWorkSeconds(142.5)).toBe("2m");
    expect(formatUnitWorkSeconds(170)).toBe("3m");
  });

  it("says '<1m' for a real value under half a minute, not '0m'", () => {
    // "0m" is what an absent typical would look like, and this one is present.
    expect(formatWorkSeconds(20)).toBe("0m");
    expect(formatUnitWorkSeconds(20)).toBe("<1m");
    expect(formatUnitWorkSeconds(0.4)).toBe("<1m");
  });

  it("keeps a true zero as '0m'", () => {
    expect(formatUnitWorkSeconds(0)).toBe("0m");
  });

  it("never renders a negative duration", () => {
    expect(formatUnitWorkSeconds(-600)).toBe("0m");
    expect(formatUnitWorkSeconds(Number.NaN)).toBe("0m");
  });
});

describe("buildTypicalMetric", () => {
  it("carries no unit marker — the card's toggle names the unit", () => {
    // The tile used to carry "pc" because it was the one per-piece figure in a
    // whole-order grid. The card now speaks one unit at a time and says which
    // in a single place, so a marker here would be a second, quieter answer to
    // a question already answered.
    expect(buildTypicalMetric(140)).toEqual({
      label: "Typical",
      valueLabel: "2m",
      supportingLabel: null,
      tone: "neutral",
    });
  });

  it("keeps the tile with no typical to show", () => {
    // The tile still says what it would be measuring.
    expect(buildTypicalMetric(null)).toEqual({
      label: "Typical",
      valueLabel: "-",
      supportingLabel: null,
      tone: "neutral",
    });
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
  it("fills proportionally against the capped pressure target", () => {
    const detail = buildRowDetail(2400, 3900, 3300, 1500, "on_track");

    expect(detail.progressPercent).toBeCloseTo(72.7, 1);
    expect(detail.positionLabel).toBe("15m left");
    expect(detail.verdictTone).toBe("on_track");
  });

  it("draws a full bar without dividing when the target is not positive", () => {
    for (const target of [0, -600]) {
      const detail = buildRowDetail(
        3000,
        target,
        target,
        target - 3000,
        "over_share",
      );

      expect(detail.progressPercent).toBe(100);
      expect(detail.positionTone).toBe("over");
    }
  });

  it("falls back to the assignment when pressure is not applicable", () => {
    expect(buildRowDetail(900, 3600, null, 2700, "on_track")).toMatchObject({
      progressPercent: 25,
      positionLabel: "45m left",
    });
  });

  it("clamps a section that worked past its pressure target", () => {
    expect(
      buildRowDetail(9000, 3600, 1800, -5400, "over_share").progressPercent,
    ).toBe(100);
  });

  it("uses the served assignment overrun when zero pressure is exhausted", () => {
    expect(buildRowDetail(2729, 1187, 0, -1542, "over_share")).toMatchObject({
      progressPercent: 100,
      positionLabel: "25m over",
      positionTone: "over",
      verdictTone: "over_share",
    });
  });

  it("takes the verdict from share_state rather than the arithmetic", () => {
    // Worked is comfortably under the allowance, but the server says the
    // section overran — across both of its passes. The server wins.
    expect(
      buildRowDetail(600, 3600, 1800, 3000, "over_share").verdictTone,
    ).toBe("over_share");
    expect(
      buildRowDetail(9000, 3600, 1800, -5400, "on_track").verdictTone,
    ).toBe("on_track");
  });
});

describe("pressure and row metrics", () => {
  it("caps a pressure improvement at the original assignment", () => {
    expect(capPressureSeconds(3600, 4800)).toBe(3600);
    expect(
      buildActiveMetrics(3600, 4800, 3000, 3600, "on_track")[1]
        .valueLabel,
    ).toBe("1h 0m");
  });

  it("uses a tightened pressure target and preserves null as missing", () => {
    expect(capPressureSeconds(3600, 1200)).toBe(1200);
    expect(
      buildActiveMetrics(3600, 1200, null, 3600, "on_track").map(
        (metric) => metric.valueLabel,
      ),
    ).toEqual(["1h 0m", "20m", "-"]);
    expect(
      buildActiveMetrics(3600, null, 3000, 3600, "on_track")[1]
        .valueLabel,
    ).toBe("-");
  });

  it("replaces exhausted pressure with the served budget overrun", () => {
    expect(buildActiveMetrics(1187, 0, 1171, -1542, "over_share")[1]).toEqual({
      label: "Over budget",
      valueLabel: "25m",
      supportingLabel: null,
      tone: "danger",
    });
  });

  it("builds negative red over, positive green under, and green on-budget variance", () => {
    expect(buildTerminalMetrics(4200, 3600, 3000)[1]).toEqual({
      label: "Variance",
      valueLabel: "-10m",
      supportingLabel: "over budget",
      tone: "danger",
    });
    expect(buildTerminalMetrics(3000, 3600, 3000)[1]).toMatchObject({
      valueLabel: "+10m",
      supportingLabel: "under budget",
      tone: "success",
    });
    expect(buildTerminalMetrics(3600, 3600, 3000)[1]).toMatchObject({
      valueLabel: "0m",
      supportingLabel: "on budget",
      tone: "success",
    });
  });

  it("renders missing terminal metrics as dashes", () => {
    expect(buildTerminalMetrics(3000, null, null).map((metric) => metric.valueLabel)).toEqual([
      "-",
      "-",
      "-",
    ]);
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
      label: "~43m expected left · ~15m over budget",
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
      "~43m expected left · ~53m over budget",
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

describe("selectAnchorRowIndex", () => {
  const tones = (...values: ProductionTimeRowViewModel["tone"][]) =>
    values.map((tone, index) => row({ key: `row-${index}`, tone }));

  it("anchors on the oldest working section first", () => {
    expect(
      selectAnchorRowIndex(
        tones("completed", "working", "paused", "working", "pending"),
      ),
    ).toBe(1);
  });

  it("falls back to the oldest paused section", () => {
    expect(
      selectAnchorRowIndex(
        tones("completed", "pending", "paused", "paused", "pending"),
      ),
    ).toBe(2);
  });

  it("falls back to the last completed section", () => {
    expect(
      selectAnchorRowIndex(
        tones("completed", "completed", "pending", "pending"),
      ),
    ).toBe(1);
  });

  it("stays at the top of an untouched pipeline", () => {
    expect(
      selectAnchorRowIndex(tones("pending", "blocked", "pending")),
    ).toBe(0);
    expect(selectAnchorRowIndex([])).toBe(0);
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

// --- The per-piece unit -----------------------------------------------------
// The builders never learn the quantity. They take already-divided seconds and
// the formatter to render them with, which is the mechanical reason none of
// them can divide a typical.

describe("builders under the rounding formatter", () => {
  it("keeps a sub-minute variance signed rather than rounding it to zero", () => {
    // 20s over, per piece. "0m on budget" would turn a danger tile green on a
    // toggle press, so the sign decides the branch before the formatter runs
    // and "<1m" is the honest rendering of what is left.
    const over = buildTerminalMetrics(620, 600, null, formatUnitWorkSeconds);
    expect(over[1]).toMatchObject({
      valueLabel: "-<1m",
      supportingLabel: "over budget",
      tone: "danger",
    });

    const under = buildTerminalMetrics(580, 600, null, formatUnitWorkSeconds);
    expect(under[1]).toMatchObject({
      valueLabel: "+<1m",
      supportingLabel: "under budget",
      tone: "success",
    });
  });

  it("still says exactly '0m' on budget, in either formatter", () => {
    expect(buildTerminalMetrics(600, 600, null, formatUnitWorkSeconds)[1]).toMatchObject({
      valueLabel: "0m",
      supportingLabel: "on budget",
      tone: "success",
    });
  });

  it("dashes a missing figure before the formatter is ever consulted", () => {
    expect(metricValueLabel(null, formatUnitWorkSeconds)).toBe("-");
    expect(metricValueLabel(null)).toBe("-");
  });

  it("rounds the position line and keeps its wording", () => {
    // 10s left and 10s over: both real positions, neither of them "0m".
    expect(
      buildRowDetail(590, 600, null, 10, "on_track", formatUnitWorkSeconds)
        .positionLabel,
    ).toBe("<1m left");
    expect(
      buildRowDetail(610, 600, null, -10, "on_track", formatUnitWorkSeconds)
        .positionLabel,
    ).toBe("<1m over");
  });

  it("rounds the over-budget tile without changing its verdict", () => {
    const metrics = buildActiveMetrics(
      600,
      600,
      null,
      -20,
      "over_share",
      formatUnitWorkSeconds,
    );
    expect(metrics[1]).toMatchObject({
      label: "Over budget",
      valueLabel: "<1m",
      tone: "danger",
    });
  });

  it("divides only the time half of the infeasible notice", () => {
    const wholeOrder = buildInfeasibleNotice(-50_000, -2304);
    const perPiece = buildInfeasibleNotice(
      -50_000,
      -2304 / 4,
      formatUnitWorkSeconds,
    );
    const figures = (
      notice: ReturnType<typeof buildInfeasibleNotice>,
    ): string[] =>
      notice.body.filter((segment) => segment.emphasis).map(({ text }) => text);

    // The krona shortfall is a fact about the ORDER and is byte-identical.
    expect(figures(wholeOrder)[0]).toBe(figures(perPiece)[0]);
    expect(figures(wholeOrder)[1]).toBe("38m");
    expect(figures(perPiece)[1]).toBe("10m");
  });
});

describe("buildOutlookLabel", () => {
  it("names both figures in whichever unit it is handed", () => {
    expect(buildOutlookLabel(2400, 1200)).toBe(
      "~40m expected left · ~20m over budget",
    );
    expect(buildOutlookLabel(600, 300, formatUnitWorkSeconds)).toBe(
      "~10m expected left · ~5m over budget",
    );
  });

  it("hedges twice rather than claiming a per-piece overrun of zero", () => {
    // The 60s gate is whole-order — whether the sentence appears at all is a
    // fact about the order — so a large order can legitimately restate a real
    // overrun as "~<1m".
    // 100s still committed against an 80s overrun, spread over four pieces.
    expect(buildOutlookLabel(100 / 4, 80 / 4, formatUnitWorkSeconds)).toBe(
      "~<1m expected left · ~<1m over budget",
    );
  });
});

describe("buildRowUnitReading", () => {
  const base = {
    quantity: 4,
    workedSeconds: 2400,
    allowanceSeconds: 3900,
    pressureSeconds: 3300,
    leftSeconds: 1500,
    unitTypicalSeconds: 1200,
    shareState: "on_track" as const,
    hasTerminalMetrics: false,
    hasActiveMetrics: true,
    hasDetail: true,
    allowanceSuffix: "assigned",
  };

  it("divides every exact count and keeps the served typical verbatim", () => {
    const reading = buildRowUnitReading(base);

    expect(reading.workedLabel).toBe("10m");
    expect(reading.allowanceLabel).toBe("16m assigned");
    expect(reading.pressureLabel).toBe("14m pressure");
    // 1200s served, not 3900/4 or any other derivation of a neighbour.
    expect(reading.typicalLabel).toBe("typical 20m");
    expect(reading.activeMetrics?.[2]?.valueLabel).toBe("20m");
  });

  it("leaves the progress geometry and both tones untouched", () => {
    // Numerator and denominator divide by the same quantity, so the ratio — and
    // therefore the bar, the position tone and the verdict — cannot move.
    const wholeOrder = buildRowDetail(2400, 3900, 3300, 1500, "on_track");
    const perPiece = buildRowUnitReading(base).detail!;

    expect(perPiece.progressPercent).toBeCloseTo(wholeOrder.progressPercent);
    expect(perPiece.positionTone).toBe(wholeOrder.positionTone);
    expect(perPiece.verdictTone).toBe(wholeOrder.verdictTone);
    // Only the copy restates.
    // The target is the capped pressure share, 3300s: 15m left of it whole
    // order, 3m45s per piece, which the rounding formatter reads as 4m.
    expect(perPiece.positionLabel).toBe("4m left");
    expect(wholeOrder.positionLabel).toBe("15m left");
  });

  it("takes its shape from the whole-order row rather than deciding again", () => {
    const reading = buildRowUnitReading({
      ...base,
      hasActiveMetrics: false,
      hasDetail: false,
      hasTerminalMetrics: true,
    });

    expect(reading.activeMetrics).toBeNull();
    expect(reading.detail).toBeNull();
    expect(reading.terminalMetrics).not.toBeNull();
  });

  it("reads a non-positive allowance on the undivided value", () => {
    // "0m assigned" would read as a budget of zero rather than the absence of
    // one, in either unit.
    expect(buildRowUnitReading({ ...base, allowanceSeconds: 0 }).allowanceLabel)
      .toBeNull();
    expect(
      buildRowUnitReading({ ...base, allowanceSeconds: null }).allowanceLabel,
    ).toBeNull();
  });

  it("has no typical at all when the server sent no per-unit median", () => {
    const reading = buildRowUnitReading({ ...base, unitTypicalSeconds: null });

    expect(reading.typicalLabel).toBeNull();
    expect(reading.typicalComparisonLabel).toBeNull();
    expect(reading.activeMetrics?.[2]?.valueLabel).toBe("-");
  });
});
