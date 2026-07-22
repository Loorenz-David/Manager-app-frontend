import { describe, expect, it } from "vitest";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  PauseReasonsListSchema,
  PauseReasonSchema,
} from "./types";
import { toPauseReasonPickerOption } from "./lib/pause-reason-view-model";

const lunchReason = {
  client_id: "par_01J3N6K2P6Z0X3Y9V7Q8W5R4T1",
  name: "Lunch break",
  image_url: null,
  pause_type: "personal",
  description: null,
  requires_description: false,
  is_system_managed: false,
  slug: "pause_lunch_break",
  created_at: "2026-07-22T11:00:00+00:00",
  created_by_id: null,
  updated_at: null,
  updated_by_id: null,
} as const;

describe("pause reason DTOs", () => {
  it("parses the list envelope and preserves backend fields", () => {
    const response = ApiEnvelopeSchema(PauseReasonsListSchema).parse({
      ok: true,
      data: {
        pause_reasons: [lunchReason],
        pause_reasons_pagination: { has_more: false, limit: 50, offset: 0 },
      },
      warnings: [],
    });

    expect(response.data.pause_reasons[0]?.client_id).toBe(
      lunchReason.client_id,
    );
    expect(response.data.pause_reasons[0]?.image_url).toBeNull();
  });

  it("maps a reason to a picker option without inventing an image", () => {
    const reason = PauseReasonSchema.parse(lunchReason);
    const option = toPauseReasonPickerOption(reason);

    expect(option).toMatchObject({
      value: lunchReason.client_id,
      label: "Lunch break",
      image: null,
      slug: "pause_lunch_break",
      requires_description: false,
    });
  });
});
