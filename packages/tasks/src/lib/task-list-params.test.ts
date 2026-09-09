import { describe, expect, it } from "vitest";

import { buildTaskListParams } from "./task-list-params";
import type { TaskListParamsInput } from "./task-list-params";

function build(
  overrides: Partial<TaskListParamsInput> = {},
): ReturnType<typeof buildTaskListParams> {
  return buildTaskListParams({
    taskType: "all",
    taskStates: [],
    q: "",
    itemPosition: "",
    groupByUpholstery: false,
    ...overrides,
  });
}

describe("buildTaskListParams", () => {
  it("hides completed and closed-out work when nothing is filtered or searched", () => {
    const params = build();

    expect(params.not_task_states).toBe("resolved,failed,cancelled,ready");
    expect(params.task_states).toBeUndefined();
    expect(params.order_by).toBeUndefined();
  });

  it("sorts by completion and drops the default exclusion for a ready cohort", () => {
    const params = build({ taskStates: ["ready"] });

    expect(params.task_states).toBe("ready");
    expect(params.order_by).toBe("recently_completed");
    expect(params.not_task_states).toBeUndefined();
  });

  it("sorts by completion for the ready + resolved pair", () => {
    const params = build({ taskStates: ["ready", "resolved"] });

    expect(params.task_states).toBe("ready,resolved");
    expect(params.order_by).toBe("recently_completed");
  });

  it("leaves the default ordering for an in-progress cohort", () => {
    const params = build({ taskStates: ["working"] });

    expect(params.task_states).toBe("working");
    expect(params.order_by).toBeUndefined();
    expect(params.not_task_states).toBeUndefined();
  });

  it("keeps the completion sort alongside grouping", () => {
    const params = build({
      taskStates: ["ready"],
      groupByUpholstery: true,
    });

    expect(params.group_by_upholstery).toBe(true);
    expect(params.order_by).toBe("recently_completed");
  });

  it("drops the default exclusion for a search with no state pills", () => {
    const params = build({ q: "sofa" });

    expect(params.q).toBe("sofa");
    expect(params.not_task_states).toBeUndefined();
    expect(params.order_by).toBeUndefined();
  });

  it("passes through the remaining filters", () => {
    const params = build({ taskType: "pre_order", itemPosition: "A1" });

    expect(params.task_types).toBe("pre_order");
    expect(params.item_position).toBe("A1");
  });
});
