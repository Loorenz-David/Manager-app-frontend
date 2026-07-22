import { describe, expect, it } from "vitest";

import {
  buildPublishPayloads,
  mapPublishFailure,
  priorityForCategory,
  type PublishFormState,
} from "./publish-form";

const baseForm = (overrides: Partial<PublishFormState> = {}): PublishFormState => ({
  audienceMode: "all_matching",
  appKeys: ["manager", "worker"],
  roleKeys: ["manager"],
  userIds: [],
  category: "improvement",
  presentationType: "slide_page",
  isDismissible: true,
  priorityValue: "",
  startsAtLocal: "",
  expiresAtLocal: "",
  ...overrides,
});

describe("publish form mapping", () => {
  it("maps all-matching audience dimensions without a workspace target", () => {
    const result = buildPublishPayloads("aup_example", baseForm());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.payloads.audience).toEqual({
      presentationId: "aup_example",
      audience_mode: "all_matching",
      app_keys: ["manager", "worker"],
      role_keys: ["manager"],
      workspace_ids: [],
      user_ids: [],
    });
  });

  it("requires direct users and clears ignored roles in selected-users-only mode", () => {
    const invalid = buildPublishPayloads("aup_example", baseForm({
      audienceMode: "selected_users_only",
    }));
    expect(invalid.success).toBe(false);

    const valid = buildPublishPayloads("aup_example", baseForm({
      audienceMode: "selected_users_only",
      userIds: ["usr_one"],
    }));
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.payloads.audience.role_keys).toEqual([]);
    expect(valid.payloads.audience.user_ids).toEqual(["usr_one"]);
  });

  it.each([
    ["alert", 300],
    ["workflow", 200],
    ["improvement", 100],
    ["news", 0],
    ["none", 0],
  ] as const)("derives %s priority as %i", (category, expected) => {
    expect(priorityForCategory(category)).toBe(expected);
    const result = buildPublishPayloads("aup_example", baseForm({ category }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.payloads.metadata.display_priority).toBe(expected);
  });

  it("always sends an explicit integer priority and lets an override win", () => {
    const result = buildPublishPayloads("aup_example", baseForm({
      category: "alert",
      priorityValue: "42",
    }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.payloads.metadata.display_priority).toBe(42);
  });

  it("maps local schedule values to UTC and rejects an inverted window", () => {
    const valid = buildPublishPayloads("aup_example", baseForm({
      startsAtLocal: "2026-07-23T09:30",
      expiresAtLocal: "2026-07-23T10:30",
    }));
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.payloads.metadata.starts_at).toBe(new Date("2026-07-23T09:30").toISOString());
    }

    const invalid = buildPublishPayloads("aup_example", baseForm({
      startsAtLocal: "2026-07-23T10:30",
      expiresAtLocal: "2026-07-23T09:30",
    }));
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.issues.fields.expiresAt).toMatch(/after/i);
  });
});

describe("publish server error mapping", () => {
  it.each([
    ["At least one slide is required", "Add at least one slide"],
    ["Slide 2 has no content", "Every slide needs"],
    ["Unsupported media storage reference", "media files are invalid"],
    ["expires_at must be after starts_at", "Expiry must be after"],
    ["selected_users_only requires at least one user_id", "active workspace member"],
    ["Unknown role key", "not recognized"],
  ])("maps %s", (message, expected) => {
    const issues = mapPublishFailure(Object.assign(new Error(message), { status: 422 }), "publish");
    expect(issues.summary.join(" ")).toContain(expected);
  });

  it("maps a raced 409 to a friendly refetch state", () => {
    const issues = mapPublishFailure(Object.assign(new Error("not draft"), { status: 409 }), "publish");
    expect(issues.raced).toBe(true);
    expect(issues.summary[0]).toMatch(/reloaded/i);
  });
});
