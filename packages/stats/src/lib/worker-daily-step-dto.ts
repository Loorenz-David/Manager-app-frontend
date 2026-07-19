import {
  humanizeStepState,
  RETURN_SOURCE_LABEL,
  STEP_STATE_VARIANT,
  TASK_TYPE_LABEL,
  type StepState,
  type TaskType,
} from "@beyo/tasks";
import { toImageAnnotationViewModel, type ImageViewModel } from "@beyo/images";
import type { StatePillVariant } from "@beyo/ui";

import { formatHHmm, secondsToHM } from "./format-duration";
import {
  appliesFill,
  DEFAULT_FILL_MODE,
  fillToSeconds,
  type TimeFillMode,
} from "./time-quality";
import type {
  DailyStepImage,
  WorkerDailyStep,
  WorkerGranularityIntention,
} from "../types";

// The step state a card's pill reflects is driven by the active intention,
// not by the step's own live state.
const INTENTION_STEP_STATE: Record<WorkerGranularityIntention, StepState> = {
  working: "working",
  paused: "paused",
  completed: "completed",
};

// Static text, or a live-ticking interval (HH:MM:SS) when the step has an open
// record whose state matches the active intention. Active steps share real time
// across the currently displayed steps in that state.
export type GranularityTimeModel =
  | { kind: "static"; text: string }
  | {
      kind: "ticking";
      offsetSeconds: number;
      startedAtIso: string;
      ratePerSecond: number;
    };

export type WorkerDailyStepCardViewModel = {
  stepId: string;
  taskId: string;
  itemId: string | null;
  intention: WorkerGranularityIntention;
  imageUrl: string | null;
  images: ImageViewModel[];
  articleLabel: string;
  quantityLabel: string | null;
  typeLabel: string;
  detailLabel: string | null;
  taskType: TaskType | null;
  stateLabel: string;
  stateVariant: StatePillVariant;
  time: GranularityTimeModel;
  // Step flagged as inaccurately timed. Its displayed working/paused time is
  // trusted contribution + the estimated fill for the selected mode.
  isTimeInaccurate: boolean;
  // Badge copy for a flagged step, or null when not flagged. "Estimated" only
  // when time was actually added — under the `none` mode, or when the backend
  // suppressed a thin estimate to 0, the honest label is "Flagged": the shown
  // time is trusted-only and therefore incomplete, not estimated.
  inaccurateBadgeLabel: string | null;
};

function toImageViewModel(
  raw: DailyStepImage,
  itemClientId: string,
  index: number,
): ImageViewModel {
  const isFirst = index === 0;
  const record = raw as DailyStepImage & {
    image_annotation?: Parameters<typeof toImageAnnotationViewModel>[0] | null;
  };

  return {
    clientId: record.client_id,
    linkClientId: null,
    entityType: "item",
    entityClientId: itemClientId,
    imageUrl: record.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: record.width_px ?? null,
    heightPx: record.height_px ?? null,
    fileSizeBytes: record.file_size_bytes ?? null,
    createdAt: isFirst ? (record.created_at ?? null) : null,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation:
      isFirst && record.image_annotation
        ? toImageAnnotationViewModel(record.image_annotation)
        : null,
    annotations: [],
    isFullyLoaded: isFirst,
  };
}

// Estimated seconds this step's displayed time should absorb under `mode`.
// Zero for unflagged steps, for the `completed` intention, and under `none`.
// A real strategy can also legitimately resolve to 0 — the backend suppresses
// the fill when fewer than 4 trusted samples back it.
function resolveFill(
  step: WorkerDailyStep,
  intention: WorkerGranularityIntention,
  mode: TimeFillMode,
): number {
  if (!step.is_time_inaccurate || intention === "completed" || !appliesFill(mode)) {
    return 0;
  }

  return fillToSeconds(
    intention === "working"
      ? step.estimated_fill_by_strategy.working[mode]
      : step.estimated_fill_by_strategy.paused[mode],
  );
}

function resolveTime(
  step: WorkerDailyStep,
  intention: WorkerGranularityIntention,
  activeStepCount: number,
  fill: number,
): GranularityTimeModel {
  if (intention === "completed") {
    return { kind: "static", text: formatHHmm(step.last_completed_at) };
  }

  // Flagged steps contribute trusted-only seconds (usually 0); `fill` is their
  // estimated replacement. `wasted` never enters.
  const settledSeconds =
    (intention === "working"
      ? step.contribution.working_seconds
      : step.contribution.pause_seconds) + fill;

  const isOpenForIntention = step.active_record?.state === intention;

  if (isOpenForIntention && step.active_record) {
    return {
      kind: "ticking",
      offsetSeconds: settledSeconds,
      startedAtIso: step.active_record.entered_at,
      ratePerSecond: 1 / Math.max(1, activeStepCount),
    };
  }

  return { kind: "static", text: secondsToHM(settledSeconds) };
}

export function toWorkerDailyStepCardViewModel(
  step: WorkerDailyStep,
  intention: WorkerGranularityIntention,
  activeStepCount = 1,
  mode: TimeFillMode = DEFAULT_FILL_MODE,
): WorkerDailyStepCardViewModel {
  const item = step.item;
  const itemId = item?.client_id ?? null;
  const images = itemId
    ? step.item_images.map((image, index) =>
        toImageViewModel(image, itemId, index),
      )
    : [];

  const articleLabel = item
    ? item.article_number
      ? `#${item.article_number}`
      : (item.sku ?? "Article number missing")
    : "No item linked";

  const detailLabel = step.task?.return_source
    ? (RETURN_SOURCE_LABEL[step.task.return_source] ?? null)
    : (step.working_section_name_snapshot ?? null);

  const pillState = INTENTION_STEP_STATE[intention];
  const fill = resolveFill(step, intention, mode);
  const time = resolveTime(step, intention, activeStepCount, fill);

  return {
    stepId: step.client_id,
    taskId: step.task_id,
    itemId,
    intention,
    imageUrl: images[0]?.imageUrl ?? null,
    images,
    articleLabel,
    quantityLabel: item ? `#${item.quantity}` : null,
    typeLabel: step.task ? TASK_TYPE_LABEL[step.task.task_type] : "—",
    detailLabel,
    taskType: step.task?.task_type ?? null,
    stateLabel:
      intention === "working" && time.kind !== "ticking"
        ? "Worked"
        : humanizeStepState(pillState),
    stateVariant: STEP_STATE_VARIANT[pillState],
    time,
    isTimeInaccurate: step.is_time_inaccurate,
    inaccurateBadgeLabel: step.is_time_inaccurate
      ? (fill > 0 ? "Estimated" : "Flagged")
      : null,
  };
}
