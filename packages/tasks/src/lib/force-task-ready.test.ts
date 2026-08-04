import { describe, expect, it } from "vitest";

import { ApiRequestError } from "@beyo/api-client";

import {
  canForceTaskReady,
  isOpenStepState,
  resolveForceTaskReadyErrorMessage,
} from "./force-task-ready";

describe("isOpenStepState", () => {
  it.each(["pending", "working", "paused", "ended_shift", "blocked"])(
    "treats %s as still open",
    (state) => {
      expect(isOpenStepState(state)).toBe(true);
    },
  );

  it.each(["completed", "skipped", "failed", "cancelled"])(
    "treats %s as terminal",
    (state) => {
      expect(isOpenStepState(state)).toBe(false);
    },
  );
});

describe("canForceTaskReady", () => {
  it.each(["pending", "assigned", "working", "stalled"] as const)(
    "allows forcing from %s",
    (state) => {
      expect(canForceTaskReady(state)).toBe(true);
    },
  );

  // Each of these is a 409 from the endpoint.
  it.each(["ready", "resolved", "failed", "cancelled"] as const)(
    "blocks forcing from %s",
    (state) => {
      expect(canForceTaskReady(state)).toBe(false);
    },
  );

  it("blocks when the task has not loaded yet", () => {
    expect(canForceTaskReady(null)).toBe(false);
    expect(canForceTaskReady(undefined)).toBe(false);
  });
});

describe("resolveForceTaskReadyErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(resolveForceTaskReadyErrorMessage(null)).toBeNull();
  });

  it("surfaces the server message verbatim for a conflict", () => {
    const error = new ApiRequestError(409, "conflict", "Task is already ready.");

    expect(resolveForceTaskReadyErrorMessage(error)).toBe(
      "Task is already ready.",
    );
  });

  it("surfaces the server message verbatim for an unprocessable step", () => {
    const error = new ApiRequestError(
      422,
      "unprocessable",
      "Cannot force this task ready — tsp_1: cannot skip a step in state failed.",
    );

    expect(resolveForceTaskReadyErrorMessage(error)).toBe(
      "Cannot force this task ready — tsp_1: cannot skip a step in state failed.",
    );
  });

  it("writes its own message for not_found and forbidden", () => {
    expect(
      resolveForceTaskReadyErrorMessage(
        new ApiRequestError(404, "not_found", "Task not found."),
      ),
    ).toBe("This task no longer exists.");

    expect(
      resolveForceTaskReadyErrorMessage(
        new ApiRequestError(403, "forbidden", "Forbidden"),
      ),
    ).toBe("You do not have permission to force a task ready.");
  });

  it("falls back to a generic message for non-api errors", () => {
    expect(resolveForceTaskReadyErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
