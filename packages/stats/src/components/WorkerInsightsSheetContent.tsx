import { Triangle } from "lucide-react";

import {
  insightExplanation,
  resolveInsightCopy,
  sampleSizeNote,
} from "../lib/insight-copy";
import type { InsightPolarity, WorkerInsight } from "../types";

const INSIGHT_TONE_CLASS: Record<
  InsightPolarity,
  { icon: string; value: string }
> = {
  positive: { icon: "bg-[#bfe3cc] text-[#1e7a46]", value: "text-[#1e7a46]" },
  negative: { icon: "bg-[#f2d79a] text-[#8a5a00]", value: "text-[#8a5a00]" },
};

export type WorkerInsightsSheetContentProps = {
  insights: WorkerInsight[];
};

export function WorkerInsightsSheetContent({
  insights,
}: WorkerInsightsSheetContentProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-3 px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="worker-stats-insights-sheet"
    >
      {insights.length === 0 ? (
        <p className="rounded-2xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No insights for today.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight, index) => {
            const copy = resolveInsightCopy(insight);
            if (!copy) {
              return null;
            }
            const tone = INSIGHT_TONE_CLASS[copy.tone];
            return (
              <li
                key={`${insight.code}-${index}`}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ${tone.icon}`}
                  >
                    <Triangle
                      className={`size-3 fill-current ${copy.tone === "negative" ? "rotate-180" : ""}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {copy.title}
                  </span>
                  {copy.rightValue ? (
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${tone.value}`}
                    >
                      {copy.rightValue}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {insightExplanation(insight.code)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {sampleSizeNote(insight.sample_size)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
