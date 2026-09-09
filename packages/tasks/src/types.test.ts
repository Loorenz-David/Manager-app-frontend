import { describe, expect, it } from "vitest";

import {
  resolveTaskCardDate,
  TaskListItemRawSchema,
  toTaskViewModel,
  TaskStepRichSchema,
} from "./types";
import type { TaskListItemRaw, TaskState } from "./types";

describe("TaskStepRichSchema", () => {
  it("accepts the latest state record returned by the task steps endpoint", () => {
    const step = TaskStepRichSchema.parse({
      client_id: "tsp_test",
      task_id: "tsk_test",
      state: "pending",
      readiness_status: "ready",
      sequence_order: null,
      working_section_id: "wsec_test",
      assigned_worker_id: null,
      total_dependencies: 0,
      completed_dependencies: 0,
      working_section_name_snapshot: "disassembly",
      assigned_worker_display_name_snapshot: null,
      created_at: "2026-07-07T09:29:43.948217+00:00",
      closed_at: null,
      ready_by_at: "2026-07-16T00:00:00+00:00",
      total_working_seconds: 0,
      total_pause_seconds: 0,
      total_ended_shift_seconds: 0,
      total_working_count: 0,
      total_pause_count: 0,
      total_ended_shift_count: 0,
      total_issues_count: 0,
      total_issues_resolved_count: 0,
      recorded_time_marked_wrong: false,
      latest_state_records: {
        id: "ssr_test",
        step_id: "tsp_test",
        state: "pending",
        pause_reason: null,
        entered_at: "2026-07-07T09:29:43.948217+00:00",
        exited_at: null,
        created_at: "2026-07-07T09:29:43.948217+00:00",
        created_by_id: "usr_test",
        description: null,
        accuracy: null,
        accuracy_measured_by: null,
        taken_from_average: false,
      },
    });

    expect(step.latest_state_records?.pause_reason).toBeNull();
  });

  it("accepts a populated pause reason", () => {
    const result = TaskStepRichSchema.shape.latest_state_records.safeParse({
      id: "ssr_test",
      step_id: "tsp_test",
      state: "paused",
      pause_reason: {
        client_id: "par_test",
        name: "Lunch break",
        image_url: null,
        pause_type: "personal",
        description: null,
        requires_description: false,
        is_system_managed: false,
        slug: "pause_lunch_break",
        created_at: "2026-07-01T10:00:00+00:00",
        created_by_id: null,
        updated_at: null,
        updated_by_id: null,
      },
      entered_at: "2026-07-07T09:29:43.948217+00:00",
      exited_at: null,
      created_at: "2026-07-07T09:29:43.948217+00:00",
      created_by_id: "usr_test",
      description: null,
      accuracy: null,
      accuracy_measured_by: null,
      taken_from_average: false,
    });

    expect(result.success).toBe(true);
  });
});

const LIST_TASK: TaskListItemRaw["task"] = {
  client_id: "tsk_test",
  task_scalar_id: 1,
  task_type: "return",
  priority: "normal",
  state: "working",
  title: null,
  summary: null,
  return_source: "after_purchase",
  item_location: null,
  return_method: null,
  fulfillment_method: null,
  additional_details: null,
  ready_by_at: "2026-09-01T00:00:00+00:00",
  scheduled_start_at: null,
  scheduled_end_at: null,
  customer_id: null,
  primary_phone_number: null,
  secondary_phone_number: null,
  primary_email: null,
  secondary_email: null,
  assortment: null,
  address: null,
  created_at: "2026-08-01T00:00:00+00:00",
  updated_at: null,
  closed_at: null,
  completed_at: null,
  is_deleted: false,
  deleted_at: null,
  post_handling: null,
};

function listRow(
  taskOverrides: Partial<TaskListItemRaw["task"]> = {},
): Record<string, unknown> {
  return {
    task: { ...LIST_TASK, ...taskOverrides },
    primary_item: null,
    item_images: [],
    last_interacted_at: null,
    upholstery_group_key: null,
    upholstery_group_image_url: null,
    upholstery_group_upholstery_id: null,
    upholstery_group_inventory: null,
  };
}

describe("TaskListItemRawSchema completion fields", () => {
  it("accepts the timestamps the sorting endpoint returns", () => {
    const row = TaskListItemRawSchema.parse({
      ...listRow({ state: "ready", completed_at: "2026-09-09T07:49:39+00:00" }),
      last_interacted_at: "2026-09-09T07:49:39+00:00",
    });

    expect(row.task.completed_at).toBe("2026-09-09T07:49:39+00:00");
    expect(row.last_interacted_at).toBe("2026-09-09T07:49:39+00:00");
  });

  it("accepts nulls, which is the pre-migration backfill tail", () => {
    const row = TaskListItemRawSchema.parse(listRow({ state: "ready" }));

    expect(row.task.completed_at).toBeNull();
    expect(row.last_interacted_at).toBeNull();
  });

  it("rejects a row missing completed_at, so mocks cannot drift from the backend", () => {
    const row = listRow() as { task: Record<string, unknown> };
    delete row.task.completed_at;

    expect(TaskListItemRawSchema.safeParse(row).success).toBe(false);
  });

  it("rejects a row missing last_interacted_at", () => {
    const row = listRow();
    delete row.last_interacted_at;

    expect(TaskListItemRawSchema.safeParse(row).success).toBe(false);
  });
});

describe("resolveTaskCardDate", () => {
  it("shows when a ready task finished", () => {
    expect(
      resolveTaskCardDate({
        ...LIST_TASK,
        state: "ready",
        completed_at: "2026-09-09T07:49:39+00:00",
      }),
    ).toEqual({ kind: "completed", at: "2026-09-09T07:49:39+00:00" });
  });

  it("shows when a resolved task was closed", () => {
    expect(
      resolveTaskCardDate({
        ...LIST_TASK,
        state: "resolved",
        closed_at: "2026-09-08T10:00:00+00:00",
        completed_at: "2026-09-08T10:00:00+00:00",
      }),
    ).toEqual({ kind: "closed", at: "2026-09-08T10:00:00+00:00" });
  });

  it("prefers the completion over a ready-by date that is also set", () => {
    expect(
      resolveTaskCardDate({
        ...LIST_TASK,
        state: "ready",
        ready_by_at: null,
        completed_at: "2026-09-09T07:49:39+00:00",
      }),
    ).toEqual({ kind: "completed", at: "2026-09-09T07:49:39+00:00" });
  });

  it("falls back to ready-by for a ready task backfilled without a completion", () => {
    expect(
      resolveTaskCardDate({ ...LIST_TASK, state: "ready", completed_at: null }),
    ).toEqual({ kind: "ready_by", at: LIST_TASK.ready_by_at });
  });

  it("falls back to ready-by for a resolved task with no closure", () => {
    expect(
      resolveTaskCardDate({
        ...LIST_TASK,
        state: "resolved",
        closed_at: null,
      }),
    ).toEqual({ kind: "ready_by", at: LIST_TASK.ready_by_at });
  });

  it.each<TaskState>(["pending", "working", "stalled", "failed", "cancelled"])(
    "shows the ready-by date for %s",
    (state) => {
      expect(
        resolveTaskCardDate({
          ...LIST_TASK,
          state,
          closed_at: "2026-09-08T10:00:00+00:00",
          completed_at: "2026-09-08T10:00:00+00:00",
        }),
      ).toEqual({ kind: "ready_by", at: LIST_TASK.ready_by_at });
    },
  );
});

describe("toTaskViewModel", () => {
  it("surfaces the card date without disturbing the existing derived fields", () => {
    const vm = toTaskViewModel({
      ...LIST_TASK,
      state: "ready",
      completed_at: "2026-09-09T07:49:39+00:00",
    });

    expect(vm.display_date).toEqual({
      kind: "completed",
      at: "2026-09-09T07:49:39+00:00",
    });
    expect(vm.ready_by_formatted).not.toBeNull();
    expect(vm.is_overdue).toBe(true);
  });
});
