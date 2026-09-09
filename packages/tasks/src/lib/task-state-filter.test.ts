import { describe, expect, it } from "vitest";

import {
  isTaskCompletionFilterState,
  resolveTaskListOrderBy,
  resolveTaskStateSelection,
} from "./task-state-filter";
import type { TaskState } from "../types";

describe("resolveTaskStateSelection", () => {
  it.each<[string, TaskState[], TaskState[], TaskState[]]>([
    ["selecting ready from nothing", [], ["ready"], ["ready"]],
    [
      "selecting ready clears the in-progress states",
      ["working", "stalled"],
      ["working", "stalled", "ready"],
      ["ready"],
    ],
    [
      "selecting resolved clears the in-progress states",
      ["pending"],
      ["pending", "resolved"],
      ["resolved"],
    ],
    [
      "ready and resolved coexist",
      ["ready"],
      ["ready", "resolved"],
      ["ready", "resolved"],
    ],
    [
      "selecting an in-progress state clears the completion pair",
      ["ready", "resolved"],
      ["ready", "resolved", "working"],
      ["working"],
    ],
    [
      "in-progress states accumulate normally",
      ["working"],
      ["working", "stalled"],
      ["working", "stalled"],
    ],
  ])("%s", (_label, previous, next, expected) => {
    expect(resolveTaskStateSelection(previous, next)).toEqual(expected);
  });

  it.each<[string, TaskState[], TaskState[], TaskState[]]>([
    [
      "deselecting one of the pair keeps the other",
      ["ready", "resolved"],
      ["ready"],
      ["ready"],
    ],
    ["deselecting the last completion state", ["ready"], [], []],
    [
      "deselecting an in-progress state",
      ["working", "stalled"],
      ["working"],
      ["working"],
    ],
  ])("%s", (_label, previous, next, expected) => {
    expect(resolveTaskStateSelection(previous, next)).toEqual(expected);
  });

  it("preserves selection order, which decides the task_states query string", () => {
    expect(
      resolveTaskStateSelection(["stalled"], ["stalled", "pending", "working"]),
    ).toEqual(["stalled", "pending", "working"]);
  });

  it("is idempotent — re-applying to its own result changes nothing", () => {
    const previous: TaskState[] = ["working", "stalled"];
    const once = resolveTaskStateSelection(previous, [
      ...previous,
      "ready",
    ] as TaskState[]);

    expect(resolveTaskStateSelection(previous, once)).toEqual(once);
  });
});

describe("isTaskCompletionFilterState", () => {
  it.each<[TaskState, boolean]>([
    ["ready", true],
    ["resolved", true],
    ["working", false],
    ["failed", false],
    ["cancelled", false],
  ])("%s -> %s", (state, expected) => {
    expect(isTaskCompletionFilterState(state)).toBe(expected);
  });
});

describe("resolveTaskListOrderBy", () => {
  it.each<[string, TaskState[]]>([
    ["only ready", ["ready"]],
    ["only resolved", ["resolved"]],
    ["the completion pair", ["ready", "resolved"]],
  ])("sorts by completion for %s", (_label, states) => {
    expect(resolveTaskListOrderBy(states)).toBe("recently_completed");
  });

  it.each<[string, TaskState[]]>([
    ["an empty selection", []],
    ["an in-progress state", ["working"]],
    ["several in-progress states", ["pending", "stalled"]],
    // Unreachable through the pills, but the sort would be meaningless: every
    // working row carries a null completed_at.
    ["a mixed selection", ["ready", "working"]],
  ])("leaves the default ordering for %s", (_label, states) => {
    expect(resolveTaskListOrderBy(states)).toBeUndefined();
  });
});
