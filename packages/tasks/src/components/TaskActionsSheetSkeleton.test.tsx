import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TaskActionsSheetSkeleton } from "./TaskActionsSheetSkeleton";

describe("TaskActionsSheetSkeleton", () => {
  it("renders one placeholder row per option that always shows on the real page", () => {
    render(<TaskActionsSheetSkeleton />);

    const skeleton = screen.getByTestId("task-actions-sheet-skeleton");
    // Pin notifications, Change task type, Change article number, Delete
    // task — the four rows TaskDetailMenuSheetPage renders unconditionally.
    // "Force ready" is excluded: its visibility depends on data that only
    // resolves after the page itself has mounted.
    expect(skeleton.children).toHaveLength(4);
  });

  it("is decorative", () => {
    render(<TaskActionsSheetSkeleton />);

    for (const row of screen.getByTestId(
      "task-actions-sheet-skeleton",
    ).children) {
      expect(row).toHaveAttribute("aria-hidden", "true");
    }
  });
});
