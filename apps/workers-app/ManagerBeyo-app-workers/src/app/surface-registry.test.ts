import { describe, expect, it, vi } from "vitest";

// `@/features/tasks/surfaces` stays real and pulls in `@beyo/tasks`, which
// imports more of `@beyo/images` than the registry object.
vi.mock("@beyo/images", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/images")>()),
  imageSurfaces: {},
}));
vi.mock("@beyo/task-creation", () => ({ taskCreationSurfaces: {} }));
vi.mock("@beyo/stock-report", () => ({ stockReportSurfaces: {} }));
vi.mock("@/app/presentation-surfaces", () => ({ presentationSurfaces: {} }));
vi.mock("@/features/cases/surfaces", () => ({ caseSurfaces: {} }));
vi.mock("@/features/home/surfaces", () => ({ homeSurfaces: {} }));
vi.mock("@/features/pwa", () => ({ pwaSurfaces: {} }));
vi.mock("@/features/task_steps/surfaces", () => ({ taskStepSurfaces: {} }));

import { surfaceRegistry } from "./surface-registry";

/**
 * The workers app registers only the shared task surfaces a read-only path
 * can reach. The edit sheets and the ⋮ sheet stay unregistered on purpose —
 * `open()` on an unknown id is a no-op, the second fail-closed layer.
 */
describe("workers surfaceRegistry — shared task surfaces", () => {
  it("registers the task detail, its filter sheet and the flow-record sheet", () => {
    expect(surfaceRegistry["task-detail-slide"]?.surface).toBe("slide");
    expect(surfaceRegistry["task-filter-sheet"]?.surface).toBe("sheet");
    expect(surfaceRegistry["task-flow-record-detail-sheet"]?.surface).toBe("sheet");
  });

  it.each([
    "task-actions-sheet",
    "task-ready-by-at-sheet",
    "item-quantity-sheet",
    "task-edit-slide",
    "task-working-sections-slide",
  ])("leaves %s unregistered", (id) => {
    expect(surfaceRegistry[id]).toBeUndefined();
  });
});
