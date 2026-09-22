import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { TaskStepId } from "@beyo/lib";

import { taskStepKeys } from "../api/task-step-keys";
import type { StepState, TaskStep } from "../types";
import { patchTaskStepDetail, seedTaskStepDetails } from "./task-step-detail-cache";

const STEP_ID = "tsp_detail" as TaskStepId;

// Only the keys the helper reads and writes — the established pattern for
// step fixtures in this app.
function step(overrides: Partial<TaskStep> = {}): TaskStep {
  return {
    client_id: STEP_ID,
    state: "working" as StepState,
    total_working_seconds: 100,
    upholstery_group_key: null,
    upholstery_group_image_url: null,
    upholstery_group_upholstery_id: null,
    upholstery_group_inventory: null,
    ...overrides,
  } as unknown as TaskStep;
}

function client(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
  });
}

describe("seedTaskStepDetails", () => {
  it("writes each step into its own detail entry", () => {
    const queryClient = client();
    const other = step({ client_id: "tsp_other" as TaskStepId });

    seedTaskStepDetails(queryClient, [step(), other]);

    expect(queryClient.getQueryData(taskStepKeys.detail(STEP_ID))).toEqual(step());
    expect(
      queryClient.getQueryData(taskStepKeys.detail("tsp_other" as TaskStepId)),
    ).toEqual(other);
  });

  it("lets the latest write win for the step's state", () => {
    const queryClient = client();
    seedTaskStepDetails(queryClient, [step({ state: "working" })]);

    seedTaskStepDetails(queryClient, [step({ state: "paused" })]);

    expect(
      queryClient.getQueryData<TaskStep>(taskStepKeys.detail(STEP_ID))?.state,
    ).toBe("paused");
  });

  it("keeps resolved upholstery group fields when an ungrouped page sends null", () => {
    // An ungrouped list page carries the four group fields as null; the
    // single-step route and a grouped page resolve them. A null must not
    // blank a value another writer resolved.
    const queryClient = client();
    seedTaskStepDetails(queryClient, [
      step({
        upholstery_group_key: "group-a",
        upholstery_group_image_url: "https://img/a.jpg",
      } as Partial<TaskStep>),
    ]);

    seedTaskStepDetails(queryClient, [step({ state: "paused" })]);

    const seeded = queryClient.getQueryData<TaskStep>(taskStepKeys.detail(STEP_ID));
    expect(seeded?.state).toBe("paused");
    expect(seeded?.upholstery_group_key).toBe("group-a");
    expect(seeded?.upholstery_group_image_url).toBe("https://img/a.jpg");
  });

  it("replaces group fields when the incoming row resolves them", () => {
    const queryClient = client();
    seedTaskStepDetails(queryClient, [
      step({ upholstery_group_key: "group-a" } as Partial<TaskStep>),
    ]);

    seedTaskStepDetails(queryClient, [
      step({ upholstery_group_key: "group-b" } as Partial<TaskStep>),
    ]);

    expect(
      queryClient.getQueryData<TaskStep>(taskStepKeys.detail(STEP_ID))
        ?.upholstery_group_key,
    ).toBe("group-b");
  });
});

describe("patchTaskStepDetail", () => {
  it("applies the update to an existing entry", () => {
    const queryClient = client();
    seedTaskStepDetails(queryClient, [step()]);

    patchTaskStepDetail(queryClient, STEP_ID, (current) => ({
      ...current,
      state: "paused",
    }));

    expect(
      queryClient.getQueryData<TaskStep>(taskStepKeys.detail(STEP_ID))?.state,
    ).toBe("paused");
  });

  it("leaves a missing entry missing rather than inventing one", () => {
    const queryClient = client();

    patchTaskStepDetail(queryClient, STEP_ID, (current) => ({
      ...current,
      state: "paused",
    }));

    expect(queryClient.getQueryData(taskStepKeys.detail(STEP_ID))).toBeUndefined();
  });
});
