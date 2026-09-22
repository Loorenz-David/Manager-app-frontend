import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";

import { taskStepKeys } from "../api/task-step-keys";
import type {
  StepState,
  TaskStep,
  TaskStepsPagination,
  UserLastActivePayload,
} from "../types";
import { useTransitionStepState } from "./use-transition-step-state";

// Only the network function and the toast are replaced. The QueryClient, the
// hook, and every cache it touches are real, so these tests observe exactly
// what the detail surface would render from.
const mocks = vi.hoisted(() => ({
  transitionStepState: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("../api/transition-step-state", () => ({
  transitionStepState: mocks.transitionStepState,
}));

vi.mock("@beyo/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/lib")>();
  return { ...actual, notify: { ...actual.notify, error: mocks.notifyError } };
});

const SECTION = "wsec_detail" as WorkingSectionId;
const STEP_ID = "tsp_detail" as TaskStepId;
const TASK_ID = "tsk_detail" as TaskId;
const RUN_STARTED = "2026-09-22T17:44:38.000Z";
const SERVER_PAUSED_AT = "2026-09-22T17:45:12.280Z";

const DETAIL_KEY = taskStepKeys.detail(STEP_ID);
// A list page of the same section that does NOT hold the step — the
// last-active-card / page-2 situation from the bug report.
const OTHER_PAGE_KEY = taskStepKeys.sectionList({
  working_section_id: SECTION,
  limit: 20,
  offset: 0,
});

function step(state: StepState = "working"): TaskStep {
  return {
    client_id: STEP_ID,
    task_id: TASK_ID,
    working_section_id: SECTION,
    state,
    last_state_record: { state, entered_at: RUN_STARTED, exited_at: null },
    total_working_seconds: 100,
  } as unknown as TaskStep;
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

function renderAction(initialState: StepState = "working") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });

  queryClient.setQueryData<TaskStep>(DETAIL_KEY, step(initialState));
  queryClient.setQueryData<TaskStepsPagination>(OTHER_PAGE_KEY, {
    items: [{ ...step(), client_id: "tsp_unrelated" as TaskStepId }],
    limit: 20,
    offset: 0,
    has_more: true,
  });
  queryClient.setQueryData<UserLastActivePayload>(taskStepKeys.userLastActive(), {
    step: null,
    batchSteps: null,
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useTransitionStepState(), { wrapper });

  return { queryClient, result };
}

function input(newState: StepState) {
  return {
    task_id: TASK_ID,
    step_id: STEP_ID,
    new_state: newState,
    working_section_id: SECTION,
  };
}

function detail(queryClient: QueryClient): TaskStep | undefined {
  return queryClient.getQueryData<TaskStep>(DETAIL_KEY);
}

function pausedResponse(settledSeconds: number) {
  return {
    kind: "immediate" as const,
    step_id: STEP_ID,
    new_state: "paused" as const,
    last_state_record: {
      state: "paused" as const,
      entered_at: SERVER_PAUSED_AT,
      exited_at: null,
    },
    was_final_step: false,
    total_working_seconds: settledSeconds,
  };
}

describe("useTransitionStepState — the step's detail entry", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("patches the detail entry before the server answers, even when no list page holds the step", async () => {
    const pending = deferred<ReturnType<typeof pausedResponse>>();
    mocks.transitionStepState.mockReturnValue(pending.promise);
    const { queryClient, result } = renderAction();
    const tappedAtMs = Date.now();

    act(() => {
      result.current.transitionStepState(input("paused"));
    });

    await waitFor(() => {
      expect(detail(queryClient)?.state).toBe("paused");
    });
    expect(result.current.isPending).toBe(true);

    // The record anchors the detail's frozen clock to the tap, not the run.
    const record = detail(queryClient)?.last_state_record;
    expect(record?.state).toBe("paused");
    expect(Date.parse(record?.entered_at ?? "")).toBeGreaterThanOrEqual(tappedAtMs);

    // The unrelated page is untouched — the patch is per step, not per page.
    expect(
      queryClient.getQueryData<TaskStepsPagination>(OTHER_PAGE_KEY)?.items[0]
        ?.state,
    ).toBe("working");

    pending.resolve(pausedResponse(147));
  });

  it("adopts the server's record in the detail entry once it answers", async () => {
    mocks.transitionStepState.mockResolvedValue(pausedResponse(147));
    const { queryClient, result } = renderAction();

    act(() => {
      result.current.transitionStepState(input("paused"));
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(detail(queryClient)?.state).toBe("paused");
    expect(detail(queryClient)?.last_state_record?.entered_at).toBe(
      SERVER_PAUSED_AT,
    );
  });

  it("restores the detail entry and says so when the server refuses", async () => {
    mocks.transitionStepState.mockRejectedValue(new Error("Conflict"));
    const { queryClient, result } = renderAction();
    const before = detail(queryClient);

    act(() => {
      result.current.transitionStepState(input("paused"));
    });

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalled();
    });
    expect(detail(queryClient)).toEqual(before);
  });

  it("reconciles the detail entry with the server after settling", async () => {
    mocks.transitionStepState.mockResolvedValue(pausedResponse(147));
    const { queryClient, result } = renderAction();

    act(() => {
      result.current.transitionStepState(input("paused"));
    });

    await waitFor(() => {
      expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
    });
  });

  it("seeds the last-active card from the detail entry when a step known only there starts", async () => {
    mocks.transitionStepState.mockReturnValue(
      deferred<ReturnType<typeof pausedResponse>>().promise,
    );
    const { queryClient, result } = renderAction("paused");

    act(() => {
      result.current.transitionStepState(input("working"));
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<UserLastActivePayload>(
          taskStepKeys.userLastActive(),
        )?.step?.client_id,
      ).toBe(STEP_ID);
    });
    expect(detail(queryClient)?.state).toBe("working");
  });
});
