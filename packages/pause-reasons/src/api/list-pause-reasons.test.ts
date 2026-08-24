import { beforeEach, describe, expect, it, vi } from "vitest";

import { listPauseReasons } from "./list-pause-reasons";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@beyo/api-client", () => ({
  apiClient: { get: mocks.get },
}));

const reason = {
  client_id: "par_1",
  name: "Lunch",
  image_url: null,
  pause_type: "personal",
  description: null,
  requires_description: false,
  is_system_managed: false,
  slug: "custom_par_1",
  created_at: "2026-08-24T12:00:00+00:00",
  created_by_id: null,
  updated_at: null,
  updated_by_id: null,
  linked_user_ids: ["usr_1", "usr_2"],
  linked_working_section_ids: ["wsec_1", "wsec_2"],
};

describe("listPauseReasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockImplementation(
      async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse({
          ok: true,
          warnings: [],
          data: {
            pause_reasons: [reason],
            pause_reasons_pagination: {
              has_more: false,
              limit: 50,
              offset: 0,
            },
          },
        }),
    );
  });

  it("repeats normalized user and working-section query parameters", async () => {
    await listPauseReasons({
      pause_type: "personal",
      user_ids: ["usr_2", "usr_1", "usr_1"],
      working_section_ids: ["wsec_2", "wsec_1"],
    });

    expect(mocks.get.mock.calls[0]?.[0]).toBe(
      "/api/v1/pause-reasons?pause_type=personal&user_ids=usr_1&user_ids=usr_2&working_section_ids=wsec_1&working_section_ids=wsec_2",
    );
  });
});
