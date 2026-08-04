import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useForceTaskReadyController } from "./use-force-task-ready.controller";

const mocks = vi.hoisted(() => ({
  role: "manager" as string,
  forceTaskReady: vi.fn(),
  notifySuccess: vi.fn(),
  steps: [] as unknown[],
  sections: [] as unknown[],
  taskState: "working" as string,
}));

vi.mock("@beyo/auth", () => ({
  AuthRole: {
    Admin: "admin",
    Manager: "manager",
    Worker: "worker",
    Seller: "seller",
  },
  useRole: () => ({ hasRole: (value: string) => value === mocks.role }),
}));

vi.mock("@beyo/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/lib")>();
  return {
    ...actual,
    notify: {
      success: (...args: unknown[]) => mocks.notifySuccess(...args),
      error: vi.fn(),
      info: vi.fn(),
    },
  };
});

vi.mock("@beyo/working-sections", () => ({
  useWorkingSectionPickerFlow: () => ({
    options: mocks.sections,
    isLoading: false,
  }),
}));

vi.mock("../api/use-get-task-query", () => ({
  useGetTaskQuery: () => ({
    data: { task: { client_id: "tsk_1", state: mocks.taskState } },
    isPending: false,
    isError: false,
  }),
}));

vi.mock("../api/use-task-steps-by-task-query", () => ({
  useTaskStepsByTaskQuery: () => ({
    data: mocks.steps,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("../actions/use-force-task-ready", () => ({
  useForceTaskReady: () => ({
    forceTaskReady: mocks.forceTaskReady,
    isPending: false,
    error: null,
  }),
}));

function makeStep(overrides: Record<string, unknown> = {}) {
  return {
    client_id: "tsp_1",
    task_id: "tsk_1",
    state: "working",
    sequence_order: 1,
    working_section_id: "ws_1",
    working_section_name_snapshot: "Upholstery",
    ...overrides,
  };
}

describe("useForceTaskReadyController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = "manager";
    mocks.taskState = "working";
    mocks.steps = [];
    mocks.sections = [];
  });

  it("lists only the steps the call will close, ordered by sequence", () => {
    mocks.steps = [
      makeStep({ client_id: "tsp_3", sequence_order: 3, state: "completed" }),
      makeStep({ client_id: "tsp_2", sequence_order: 2, state: "paused" }),
      makeStep({ client_id: "tsp_1", sequence_order: 1, state: "pending" }),
      makeStep({ client_id: "tsp_4", sequence_order: 4, state: "skipped" }),
    ];

    const { result } = renderHook(() => useForceTaskReadyController("tsk_1"));

    expect(result.current.steps.map((step) => step.stepId)).toEqual([
      "tsp_1",
      "tsp_2",
    ]);
    expect(result.current.stepCount).toBe(2);
  });

  it("joins the working-section image, which the step payload does not carry", () => {
    mocks.steps = [makeStep()];
    mocks.sections = [
      {
        client_id: "ws_1",
        name: "Upholstery workshop",
        image: "https://example.test/ws.jpg",
      },
    ];

    const { result } = renderHook(() => useForceTaskReadyController("tsk_1"));

    expect(result.current.steps[0]).toMatchObject({
      sectionName: "Upholstery workshop",
      imageUrl: "https://example.test/ws.jpg",
      stateLabel: "Working",
    });
  });

  it("falls back to the step's section snapshot when no section matches", () => {
    mocks.steps = [makeStep({ working_section_id: "ws_missing" })];

    const { result } = renderHook(() => useForceTaskReadyController("tsk_1"));

    expect(result.current.steps[0]).toMatchObject({
      sectionName: "Upholstery",
      imageUrl: null,
    });
  });

  it("blocks the action when the task is already ready or closed", () => {
    mocks.taskState = "ready";

    const { result } = renderHook(() => useForceTaskReadyController("tsk_1"));

    expect(result.current.isBlocked).toBe(true);
    expect(result.current.blockedMessage).toBeTruthy();
  });

  it("denies the action to non-managers", () => {
    mocks.role = "seller";

    const { result } = renderHook(() => useForceTaskReadyController("tsk_1"));

    expect(result.current.canForce).toBe(false);

    result.current.submit({ reason: "why not", markInaccurate: true });

    expect(mocks.forceTaskReady).not.toHaveBeenCalled();
  });

  it("sends the reason and the mark_inaccurate flag", () => {
    const { result } = renderHook(() => useForceTaskReadyController("tsk_1"));

    result.current.submit({
      reason: "Customer withdrew the return.",
      markInaccurate: false,
    });

    expect(mocks.forceTaskReady).toHaveBeenCalledWith(
      {
        task_id: "tsk_1",
        reason: "Customer withdrew the return.",
        mark_inaccurate: false,
      },
      expect.anything(),
    );
  });

  it("reports the skipped count and completes, including when nothing was open", () => {
    const onCompleted = vi.fn();
    const { result } = renderHook(() =>
      useForceTaskReadyController("tsk_1", onCompleted),
    );

    result.current.submit({ reason: "handled off-system", markInaccurate: true });

    const [, options] = mocks.forceTaskReady.mock.calls[0] as [
      unknown,
      { onSuccess: (result: unknown) => void },
    ];

    options.onSuccess({
      client_id: "tsk_1",
      state: "ready",
      skipped_step_ids: [],
    });

    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      "Task marked ready",
      "0 steps skipped.",
    );
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
