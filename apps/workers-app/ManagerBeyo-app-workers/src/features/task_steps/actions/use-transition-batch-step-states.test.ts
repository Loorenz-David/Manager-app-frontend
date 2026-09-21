import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  itemEconomicsKeys,
  type BudgetAllocationStep,
  type TaskBudgetAllocationsSnapshot,
} from "@beyo/item-economics";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";

import { taskStepKeys } from "../api/task-step-keys";
import type {
  BatchStepTransitionResponse,
  StepState,
  TaskStep,
  TaskStepsPagination,
  UserLastActivePayload,
} from "../types";
import { useTransitionBatchStepStates } from "./use-transition-batch-step-states";

// Only the network function and the toast are replaced. The QueryClient, the
// hook, and every cache it touches are real, so these tests observe exactly
// what the screen would render from.
const mocks = vi.hoisted(() => ({
  transitionBatchStepStates: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("../api/transition-batch-step-states", () => ({
  transitionBatchStepStates: mocks.transitionBatchStepStates,
}));

vi.mock("@beyo/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/lib")>();
  return { ...actual, notify: { ...actual.notify, error: mocks.notifyError } };
});

const SECTION = "wsec_batch" as WorkingSectionId;
const STEP_IDS = ["tsp_a", "tsp_b", "tsp_c"] as const;
const RUN_STARTED = "2026-09-18T09:00:00.000Z";
const SERVER_PAUSED_AT = "2026-09-18T09:00:06.120Z";
const RECEIVED_AT_MS = Date.parse("2026-09-18T09:00:01.000Z");

const LIST_KEY = taskStepKeys.sectionList({
  working_section_id: SECTION,
  limit: 20,
  offset: 0,
});
const BUDGET_KEY = itemEconomicsKeys.taskBudgetAllocations(
  STEP_IDS.map((id) => `tsk_${id}` as TaskId),
);

// Only the keys the action reads and writes — the established pattern for step
// fixtures in this app, since a full step carries dozens of unrelated fields.
function step(id: string, state: StepState = "working"): TaskStep {
  return {
    client_id: id,
    task_id: `tsk_${id}`,
    working_section_id: SECTION,
    state,
    last_state_record: { state, entered_at: RUN_STARTED, exited_at: null },
    total_working_seconds: 100,
  } as unknown as TaskStep;
}

function budgetRow(id: string): BudgetAllocationStep {
  return {
    step_id: id,
    working_section_id: SECTION,
    section_name_snapshot: "Weaving",
    typical_worker_seconds: null,
    typical_unit_worker_seconds: null,
    projected_typical_worker_seconds: null,
    typical_basis: "insufficient_sample",
    sample_count: 0,
    allowance_seconds: 3600,
    state: "working",
    pressure_share_seconds: null,
    worked_seconds: 100,
    left_seconds: 3500,
    share_state: "on_track",
    live_accrual_rate: "0.3333",
    live_concurrency: 3,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderBatchAction() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });

  queryClient.setQueryData<TaskStepsPagination>(LIST_KEY, {
    items: STEP_IDS.map((id) => step(id)),
    limit: 20,
    offset: 0,
    has_more: false,
  });
  queryClient.setQueryData<UserLastActivePayload>(taskStepKeys.userLastActive(), {
    step: null,
    batchSteps: STEP_IDS.map((id) => step(id)),
  });
  queryClient.setQueryData<TaskBudgetAllocationsSnapshot>(BUDGET_KEY, {
    allocations: STEP_IDS.map(
      (id) =>
        ({ task_id: `tsk_${id}`, steps: [budgetRow(id)] }) as unknown as
          TaskBudgetAllocationsSnapshot["allocations"][number],
    ),
    receivedAtMs: RECEIVED_AT_MS,
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useTransitionBatchStepStates(), {
    wrapper,
  });

  return { queryClient, result };
}

function batchInput(newState: StepState) {
  return {
    items: STEP_IDS.map((id) => ({
      task_id: `tsk_${id}` as TaskId,
      step_id: id as TaskStepId,
    })),
    new_state: newState,
    pause_reason_id: null,
    description: null,
    working_section_id: SECTION,
  };
}

function listStates(queryClient: QueryClient): StepState[] {
  return (
    queryClient.getQueryData<TaskStepsPagination>(LIST_KEY)?.items.map(
      (item) => item.state,
    ) ?? []
  );
}

function pausedResponse(settledSeconds: number): BatchStepTransitionResponse {
  return {
    items: STEP_IDS.map((id) => ({
      step_id: id as TaskStepId,
      new_state: "paused",
      last_state_record: {
        state: "paused",
        entered_at: SERVER_PAUSED_AT,
        exited_at: null,
      },
      was_final_step: false,
      total_working_seconds: settledSeconds,
    })),
  };
}

describe("useTransitionBatchStepStates", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows every step paused before the server answers", async () => {
    const pending = deferred<BatchStepTransitionResponse>();
    mocks.transitionBatchStepStates.mockReturnValue(pending.promise);
    const { queryClient, result } = renderBatchAction();
    const tappedAtMs = Date.now();

    act(() => {
      result.current.transitionBatch(batchInput("paused"));
    });

    await waitFor(() => {
      expect(listStates(queryClient)).toEqual(["paused", "paused", "paused"]);
    });
    expect(result.current.isPending).toBe(true);

    const lastActive = queryClient.getQueryData<UserLastActivePayload>(
      taskStepKeys.userLastActive(),
    );
    expect(lastActive?.batchSteps?.map((item) => item.state)).toEqual([
      "paused",
      "paused",
      "paused",
    ]);

    // The new record is what anchors each card's frozen value to the moment of
    // the tap, so it must be a fresh one stamped then — not the run's.
    const record = queryClient.getQueryData<TaskStepsPagination>(LIST_KEY)
      ?.items[0]?.last_state_record;
    expect(record?.state).toBe("paused");
    expect(record?.entered_at).not.toBe(RUN_STARTED);
    expect(Date.parse(record?.entered_at ?? "")).toBeGreaterThanOrEqual(
      tappedAtMs,
    );

    // Deliberately not guessed: three concurrent steps each accrue a third of
    // the wall clock, which the client cannot know until the server says.
    expect(
      queryClient.getQueryData<TaskStepsPagination>(LIST_KEY)?.items[0]
        ?.total_working_seconds,
    ).toBe(100);

    pending.resolve(pausedResponse(102));
  });

  it("adopts the server's records and settled totals once it answers", async () => {
    mocks.transitionBatchStepStates.mockResolvedValue(pausedResponse(102));
    const { queryClient, result } = renderBatchAction();

    act(() => {
      result.current.transitionBatch(batchInput("paused"));
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    const listed = queryClient.getQueryData<TaskStepsPagination>(LIST_KEY)
      ?.items[0];
    expect(listed?.last_state_record?.entered_at).toBe(SERVER_PAUSED_AT);
    expect(listed?.total_working_seconds).toBe(102);

    const budget = queryClient.getQueryData<TaskBudgetAllocationsSnapshot>(
      BUDGET_KEY,
    );
    const row = budget?.allocations[0]?.steps[0];
    expect(row?.worked_seconds).toBe(102);
    expect(row?.state).toBe("paused");
    expect(budget?.receivedAtMs).toBe(RECEIVED_AT_MS);
  });

  it("puts every cache back and says so when the server refuses", async () => {
    mocks.transitionBatchStepStates.mockRejectedValue(new Error("Conflict"));
    const { queryClient, result } = renderBatchAction();
    const listBefore = queryClient.getQueryData(LIST_KEY);
    const lastActiveBefore = queryClient.getQueryData(
      taskStepKeys.userLastActive(),
    );

    act(() => {
      result.current.transitionBatch(batchInput("paused"));
    });

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        "Batch action failed",
        "Conflict",
      );
    });
    expect(queryClient.getQueryData(LIST_KEY)).toEqual(listBefore);
    expect(queryClient.getQueryData(taskStepKeys.userLastActive())).toEqual(
      lastActiveBefore,
    );
  });

  it("reconciles with the server after a failure, not only after success", async () => {
    mocks.transitionBatchStepStates.mockRejectedValue(new Error("Conflict"));
    const { queryClient, result } = renderBatchAction();

    act(() => {
      result.current.transitionBatch(batchInput("paused"));
    });

    await waitFor(() => {
      expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    });
  });

  it("leaves the rows alone while a batch completion is in flight", async () => {
    // Completion paints a celebration before anything refreshes underneath it;
    // its caller owns that timing, so it stays un-optimistic by design.
    const pending = deferred<BatchStepTransitionResponse>();
    mocks.transitionBatchStepStates.mockReturnValue(pending.promise);
    const { queryClient, result } = renderBatchAction();

    act(() => {
      result.current.transitionBatch(batchInput("completed"));
    });

    await waitFor(() => {
      expect(mocks.transitionBatchStepStates).toHaveBeenCalled();
    });
    expect(listStates(queryClient)).toEqual(["working", "working", "working"]);

    pending.resolve({ items: [] });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
  });
});
