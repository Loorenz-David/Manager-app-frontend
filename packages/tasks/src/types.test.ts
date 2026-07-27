import { describe, expect, it } from "vitest";

import { TaskStepRichSchema } from "./types";

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
      total_cost_minor: 0,
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
