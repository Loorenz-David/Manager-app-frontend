import type { InsightPolarity, WorkerInsight } from "../types";
import { KNOWN_INSIGHT_CODES } from './insight-codes';

export { KNOWN_INSIGHT_CODES } from './insight-codes';

// Client-side copy for worker insights. The server sends codes + numbers only
// (it localizes nothing), so every phrase lives here. Valence comes from
// `polarity`, never from the sign of `delta`.

export type ResolvedInsight = {
  code: string;
  title: string;
  rightValue: string | null;
  tone: InsightPolarity;
};

// How the right-hand metric of each insight reads.
// - "count": whole-number day vs baseline, e.g. "8 vs 3".
// - "ratio": how many times the baseline, e.g. "2.2× baseline".
// - "streak": on_a_roll — the streak lives in the title; show the bar it cleared.
type RightValueKind = "count" | "ratio" | "streak";

type InsightCopySpec = {
  /** Builds the band/sheet title from the insight numbers. */
  title: (insight: WorkerInsight) => string;
  rightValue: RightValueKind;
  /** One plain sentence for the sheet's "how to read it". */
  explanation: string;
};

function roundInt(value: number): number {
  return Math.round(value);
}

function formatRatio(insight: WorkerInsight): string | null {
  if (insight.baseline_value === 0) {
    return null;
  }
  const ratio = Math.abs(insight.target_value / insight.baseline_value);
  return `${ratio.toFixed(1)}× baseline`;
}

function formatRightValue(
  kind: RightValueKind,
  insight: WorkerInsight,
): string | null {
  switch (kind) {
    case "count":
      return `${roundInt(insight.target_value)} vs ${roundInt(insight.baseline_value)}`;
    case "ratio":
      return formatRatio(insight);
    case "streak":
      return `prev best ${roundInt(insight.baseline_value)}`;
    default:
      return null;
  }
}

const INSIGHT_COPY: Record<string, InsightCopySpec> = {
  completion_surge: {
    title: (i) => `Completion surge — ${roundInt(i.delta)} more than usual`,
    rightValue: "count",
    explanation:
      "Completed noticeably more steps today than this worker's usual for this weekday.",
  },
  completion_dip: {
    title: (i) => `Completion dip — ${Math.abs(roundInt(i.delta))} fewer than usual`,
    rightValue: "count",
    explanation:
      "Completed fewer steps today than this worker's usual for this weekday.",
  },
  on_a_roll: {
    title: (i) => `On a roll — ${roundInt(i.target_value)}-day streak`,
    rightValue: "streak",
    explanation:
      "Several days in a row at or above their recent completion bar — a sustained streak.",
  },
  deep_focus: {
    title: () => "Deep focus",
    rightValue: "ratio",
    explanation:
      "Spent a larger share of the day working rather than paused than they usually do.",
  },
  faster_pace: {
    title: () => "Faster pace",
    rightValue: "ratio",
    explanation:
      "Finished more steps per focused hour than this worker's usual pace.",
  },
  slower_pace: {
    title: () => "Slower pace",
    rightValue: "ratio",
    explanation:
      "Finished fewer steps per focused hour than this worker's usual pace.",
  },
  rising_pauses: {
    title: () => "Idle longer than usual",
    rightValue: "ratio",
    explanation:
      "Average pause ran longer than usual for this weekday — possible blockers worth a check-in.",
  },
  leaving_steps_mid_shift: {
    title: () => "Leaving steps mid-shift",
    rightValue: "count",
    explanation:
      "Ended shifts on unfinished steps more often than usual, which can stall the queue.",
  },
  choppy_work: {
    title: () => "Choppy work",
    rightValue: "ratio",
    explanation:
      "More separate work sessions per finished step than usual — work was more fragmented.",
  },
  quality_watch: {
    title: () => "Quality watch",
    rightValue: "ratio",
    explanation:
      "Resolved a smaller share of raised issues than usual — worth a quality check-in.",
  },
};

export function isKnownInsight(insight: WorkerInsight): boolean {
  return KNOWN_INSIGHT_CODES.has(insight.code);
}

export function resolveInsightCopy(
  insight: WorkerInsight | undefined | null,
): ResolvedInsight | null {
  if (!insight) {
    return null;
  }
  const spec = INSIGHT_COPY[insight.code];
  if (!spec) {
    return null;
  }
  return {
    code: insight.code,
    title: spec.title(insight),
    rightValue: formatRightValue(spec.rightValue, insight),
    tone: insight.polarity,
  };
}

export function insightExplanation(code: string): string | null {
  return INSIGHT_COPY[code]?.explanation ?? null;
}

export function sampleSizeNote(sampleSize: number): string {
  return `vs their last ${sampleSize} same-weekday${sampleSize === 1 ? "" : "s"}`;
}
