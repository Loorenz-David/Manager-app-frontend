import { describe, expect, it } from "vitest";

import { presentationListItemFixture } from "../test/fixtures";
import type { PresentationListItem } from "../types";
import {
  derivePresentationDisplayStatus,
  formatPresentationMetaLine,
  getUserInitials,
  groupLatestVersions,
  toAnnouncementCardData,
} from "./presentation-dashboard";

const NOW = new Date("2026-07-22T12:00:00+00:00");

function item(overrides: Partial<PresentationListItem>): PresentationListItem {
  return { ...presentationListItemFixture, ...overrides };
}

describe("presentation dashboard view-model helpers", () => {
  it("derives all four statuses and treats starts_at equal to now as published", () => {
    expect(derivePresentationDisplayStatus(item({ status: "draft" }), NOW)).toBe("draft");
    expect(derivePresentationDisplayStatus(item({ status: "archived" }), NOW)).toBe("archived");
    expect(
      derivePresentationDisplayStatus(
        item({ status: "published", starts_at: "2026-07-22T12:00:01+00:00" }),
        NOW,
      ),
    ).toBe("scheduled");
    expect(
      derivePresentationDisplayStatus(
        item({ status: "published", starts_at: "2026-07-22T12:00:00+00:00" }),
        NOW,
      ),
    ).toBe("published");
    expect(derivePresentationDisplayStatus(item({ status: "published", starts_at: null }), NOW)).toBe(
      "published",
    );
  });

  it("keeps the highest version for each logical announcement without reordering groups", () => {
    const grouped = groupLatestVersions([
      item({ client_id: "aup_alpha_v1", logical_client_id: "aup_alpha", version: 1 }),
      item({ client_id: "aup_beta_v2", logical_client_id: "aup_beta", version: 2 }),
      item({ client_id: "aup_alpha_v3", logical_client_id: "aup_alpha", version: 3 }),
      item({ client_id: "aup_beta_v1", logical_client_id: "aup_beta", version: 1 }),
    ]);

    expect(grouped.map((entry) => entry.client_id)).toEqual(["aup_alpha_v3", "aup_beta_v2"]);
  });

  it("formats edited and scheduled meta lines with singular/plural slide labels", () => {
    expect(
      formatPresentationMetaLine(
        item({ slide_count: 1, updated_at: "2026-07-21T12:00:00+00:00" }),
        "draft",
        NOW,
      ),
    ).toBe("1 slide · edited yesterday");
    expect(
      formatPresentationMetaLine(
        item({ slide_count: 3, starts_at: "2026-07-25T08:00:00+00:00" }),
        "scheduled",
        NOW,
      ),
    ).toBe("3 slides · sends Jul 25");

    const cases = [
      ["2026-07-22T11:59:30+00:00", "just now"],
      ["2026-07-22T11:59:00+00:00", "1 minute ago"],
      ["2026-07-22T11:58:00+00:00", "2 minutes ago"],
      ["2026-07-22T11:00:00+00:00", "1 hour ago"],
      ["2026-07-22T10:00:00+00:00", "2 hours ago"],
      ["2026-07-19T12:00:00+00:00", "3 days ago"],
      ["2026-07-10T12:00:00+00:00", "Jul 10"],
      ["2026-07-22T13:00:00+00:00", "just now"],
    ] as const;
    for (const [updatedAt, label] of cases) {
      expect(formatPresentationMetaLine(item({ updated_at: updatedAt }), "draft", NOW)).toBe(
        `3 slides · edited ${label}`,
      );
    }

    expect(formatPresentationMetaLine(item({
      updated_at: null,
      published_at: "2026-07-22T11:59:00+00:00",
    }), "published", NOW)).toContain("1 minute ago");
    expect(formatPresentationMetaLine(item({
      updated_at: null,
      published_at: null,
      archived_at: "2026-07-22T11:00:00+00:00",
    }), "archived", NOW)).toContain("1 hour ago");
    expect(formatPresentationMetaLine(item({
      updated_at: null,
      published_at: null,
      archived_at: null,
      created_at: "2026-07-19T12:00:00+00:00",
    }), "draft", NOW)).toContain("3 days ago");
  });

  it("maps list preview fields directly into the approved card prop contract", () => {
    expect(
      toAnnouncementCardData(
        item({
          version: 2,
          status: "published",
          starts_at: null,
          slide_count: 3,
          media_kinds: ["image", "video"],
          cover_url: "https://cdn.example.com/cover.jpg",
        }),
        NOW,
      ),
    ).toMatchObject({
      displayStatus: "published",
      mediaKinds: ["image", "video"],
      coverImageUrl: "https://cdn.example.com/cover.jpg",
      versionLabel: "v2",
    });
  });

  it("derives stable user initials", () => {
    expect(getUserInitials("Marta Karlsson")).toBe("MK");
    expect(getUserInitials("manager-user")).toBe("MA");
    expect(getUserInitials("Marta")).toBe("MA");
    expect(getUserInitials(" ")).toBe("?");
  });
});
