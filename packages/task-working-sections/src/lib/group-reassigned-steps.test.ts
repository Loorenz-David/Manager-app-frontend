import { describe, expect, it } from "vitest";
import {
  REASSIGNED_CARPENTRY_SECTION,
  REASSIGNED_UNORDERED_SECTION,
  REASSIGNED_UPHOLSTERY_SECTION,
  makeReassignedStepItem,
} from "../mocks/reassigned-steps-fixtures";
import {
  ReassignedStepItemSchema,
  WorkingSectionCompactSchema,
  type ReassignedStepItem,
  type WorkingSectionCompact,
} from "../types";
import { groupReassignedSteps } from "./group-reassigned-steps";

function step(
  clientId: string,
  workingSectionId: string,
  snapshot = "Snapshot name",
): ReassignedStepItem {
  return ReassignedStepItemSchema.parse(
    makeReassignedStepItem({
      client_id: clientId,
      working_section_id: workingSectionId,
      working_section_name_snapshot: snapshot,
      acknowledgment: { step_id: clientId },
    }),
  );
}

function section(raw: unknown): WorkingSectionCompact {
  return WorkingSectionCompactSchema.parse(raw);
}

const UPHOLSTERY = section(REASSIGNED_UPHOLSTERY_SECTION); // order_list 2
const CARPENTRY = section(REASSIGNED_CARPENTRY_SECTION); // order_list 1
const ZETA = section(REASSIGNED_UNORDERED_SECTION); // order_list null

const SECTIONS: Record<string, WorkingSectionCompact> = {
  wsec_upholstery: UPHOLSTERY,
  wsec_carpentry: CARPENTRY,
  wsec_zeta: ZETA,
};

describe("groupReassignedSteps", () => {
  it("returns no groups for an empty list", () => {
    expect(groupReassignedSteps([], {})).toEqual([]);
  });

  it("groups a single section's steps into one container, server order kept", () => {
    const groups = groupReassignedSteps(
      [
        step("tstp_a", "wsec_upholstery"),
        step("tstp_b", "wsec_upholstery"),
        step("tstp_c", "wsec_upholstery"),
      ],
      SECTIONS,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((item) => item.client_id)).toEqual([
      "tstp_a",
      "tstp_b",
      "tstp_c",
    ]);
  });

  it("orders groups by order_list ASC", () => {
    const groups = groupReassignedSteps(
      [step("tstp_a", "wsec_upholstery"), step("tstp_b", "wsec_carpentry")],
      SECTIONS,
    );

    expect(groups.map((group) => group.name)).toEqual([
      "Carpentry", // order_list 1
      "Upholstery", // order_list 2
    ]);
  });

  it("sorts a null order_list last", () => {
    const groups = groupReassignedSteps(
      [
        step("tstp_z", "wsec_zeta"),
        step("tstp_a", "wsec_upholstery"),
        step("tstp_c", "wsec_carpentry"),
      ],
      SECTIONS,
    );

    expect(groups.map((group) => group.name)).toEqual([
      "Carpentry",
      "Upholstery",
      "Zeta",
    ]);
  });

  it("tie-breaks equal order_list values by name ASC", () => {
    const tied: Record<string, WorkingSectionCompact> = {
      wsec_beta: section({ ...(REASSIGNED_CARPENTRY_SECTION as object), client_id: "wsec_beta", name: "Beta", order_list: 5 }),
      wsec_alpha: section({ ...(REASSIGNED_CARPENTRY_SECTION as object), client_id: "wsec_alpha", name: "Alpha", order_list: 5 }),
    };

    const groups = groupReassignedSteps(
      [step("tstp_b", "wsec_beta"), step("tstp_a", "wsec_alpha")],
      tied,
    );

    expect(groups.map((group) => group.name)).toEqual(["Alpha", "Beta"]);
  });

  it("merges a section that spans a page boundary into one container", () => {
    // Page 1 → upholstery, carpentry; page 2 → more upholstery. Ordering is
    // chronological server-side, so this is the normal case (handoff §7).
    const flattenedAcrossPages = [
      step("tstp_p1_a", "wsec_upholstery"),
      step("tstp_p1_b", "wsec_carpentry"),
      step("tstp_p2_a", "wsec_upholstery"),
      step("tstp_p2_b", "wsec_upholstery"),
    ];

    const groups = groupReassignedSteps(flattenedAcrossPages, SECTIONS);

    expect(groups).toHaveLength(2);
    const upholstery = groups.find((group) => group.name === "Upholstery");
    expect(upholstery?.items.map((item) => item.client_id)).toEqual([
      "tstp_p1_a",
      "tstp_p2_a",
      "tstp_p2_b",
    ]);
  });

  it("falls back to working_section_name_snapshot when a section is missing", () => {
    const groups = groupReassignedSteps(
      [step("tstp_a", "wsec_ghost", "Ghost Section")],
      SECTIONS,
    );

    expect(groups[0]).toMatchObject({
      workingSectionId: "wsec_ghost",
      name: "Ghost Section",
      imageUrl: null,
      orderList: null,
    });
  });

  it("carries the section image and order through to the group header", () => {
    const groups = groupReassignedSteps(
      [step("tstp_a", "wsec_upholstery")],
      SECTIONS,
    );

    expect(groups[0]).toMatchObject({
      name: "Upholstery",
      imageUrl: "https://cdn.example.com/ws/upholstery.png",
      orderList: 2,
    });
  });
});
