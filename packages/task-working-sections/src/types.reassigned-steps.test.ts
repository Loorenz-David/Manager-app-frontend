import { describe, expect, it } from "vitest";
import {
  EMPTY_REASSIGNED_STEPS_RESPONSE,
  REASSIGNED_STEPS_COUNT_RESPONSE,
  REASSIGNED_UPHOLSTERY_SECTION,
  makeReassignedStepItem,
  makeReassignedStepsResponse,
} from "./mocks/reassigned-steps-fixtures";
import {
  ReassignedStepItemSchema,
  ReassignedStepsCountResponseSchema,
  ReassignedStepsResponseSchema,
} from "./types";

describe("ReassignedStepItemSchema", () => {
  it("parses the handoff §3.6 example verbatim", () => {
    const parsed = ReassignedStepItemSchema.parse(makeReassignedStepItem());

    expect(parsed.client_id).toBe("tstp_9f3a1c");
    expect(parsed.is_reassigned).toBe(true);
    expect(parsed.acknowledgment.client_id).toBe("tsa_31f7");
    expect(parsed.acknowledgment.acknowledged_at).toBeNull();
    expect(parsed.updated_at).toBeNull();
    // The four upholstery_group_* keys are always null on this endpoint.
    expect(parsed.upholstery_group_key).toBeNull();
    expect(parsed.upholstery_group_inventory).toBeNull();
  });

  it("accepts state: 'ended_shift' during the interim window (handoff §6.1)", () => {
    const parsed = ReassignedStepItemSchema.parse(
      makeReassignedStepItem({ state: "ended_shift" }),
    );

    expect(parsed.state).toBe("ended_shift");
  });

  it("accepts a terminal prerequisite_step_state on a dependency", () => {
    const parsed = ReassignedStepItemSchema.parse(makeReassignedStepItem());

    expect(parsed.dependency_working_sections[0]?.prerequisite_step_state).toBe(
      "completed",
    );
  });

  it("parses item: null", () => {
    const parsed = ReassignedStepItemSchema.parse(
      makeReassignedStepItem({ item: null, item_images: [] }),
    );

    expect(parsed.item).toBeNull();
    expect(parsed.item_images).toEqual([]);
  });

  it("parses a single rich-only image (no light elements)", () => {
    const richOnly = makeReassignedStepItem({
      item_images: [
        {
          client_id: "img_only",
          image_url: "https://cdn.example.com/i/only.jpg",
          storage_provider: "s3",
          source_type: "upload",
          source_reference: null,
          width_px: 800,
          height_px: 600,
          file_size_bytes: 1234,
          created_at: "2026-07-12T09:14:00+00:00",
          last_event: null,
          events: [],
          image_annotation: null,
        },
      ],
    });

    const parsed = ReassignedStepItemSchema.parse(richOnly);
    expect(parsed.item_images).toHaveLength(1);
    expect("image_annotation" in parsed.item_images[0]!).toBe(true);
  });

  it("handles the heterogeneous image array (rich at [0], light after)", () => {
    const parsed = ReassignedStepItemSchema.parse(makeReassignedStepItem());

    expect("image_annotation" in parsed.item_images[0]!).toBe(true);
    expect("image_annotation" in parsed.item_images[1]!).toBe(false);
  });

  it("parses acknowledgment.reason: null", () => {
    const parsed = ReassignedStepItemSchema.parse(
      makeReassignedStepItem({ acknowledgment: { reason: null } }),
    );

    expect(parsed.acknowledgment.reason).toBeNull();
  });
});

describe("ReassignedStepsResponseSchema", () => {
  it("parses a populated page with its working_sections map", () => {
    const parsed = ReassignedStepsResponseSchema.parse(
      makeReassignedStepsResponse({
        items: [makeReassignedStepItem()],
        workingSections: { wsec_upholstery: REASSIGNED_UPHOLSTERY_SECTION },
        limit: 50,
      }),
    );

    expect(parsed.steps_pagination.items).toHaveLength(1);
    expect(parsed.working_sections["wsec_upholstery"]?.name).toBe("Upholstery");
    expect(parsed.working_sections["wsec_upholstery"]?.order_list).toBe(2);
  });

  it("parses the empty result — not an error state (handoff §10)", () => {
    const parsed = ReassignedStepsResponseSchema.parse(
      EMPTY_REASSIGNED_STEPS_RESPONSE,
    );

    expect(parsed.steps_pagination.items).toEqual([]);
    expect(parsed.steps_pagination.has_more).toBe(false);
    expect(parsed.working_sections).toEqual({});
  });
});

describe("ReassignedStepsCountResponseSchema", () => {
  it("parses the badge payload", () => {
    const parsed = ReassignedStepsCountResponseSchema.parse(
      REASSIGNED_STEPS_COUNT_RESPONSE,
    );

    expect(parsed.reassigned_steps_count).toEqual({
      total: 7,
      unacknowledged: 3,
    });
  });

  it("parses zeroes rather than nulls when nothing is visible", () => {
    const parsed = ReassignedStepsCountResponseSchema.parse({
      reassigned_steps_count: { total: 0, unacknowledged: 0 },
    });

    expect(parsed.reassigned_steps_count.total).toBe(0);
  });
});
