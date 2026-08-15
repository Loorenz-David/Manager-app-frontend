import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReturnSubmitOverlay } from "./ReturnSubmitOverlay";

describe("ReturnSubmitOverlay", () => {
  it("shows the provisional marker while creating", () => {
    render(
      <ReturnSubmitOverlay isSkuProvisional phase="creating" sku="RET-7" />,
    );

    expect(screen.getByText("Creating return…")).toBeVisible();
    expect(
      screen.getByTestId("task-creation-submit-overlay-sku-value"),
    ).toHaveTextContent("≈ RET-7");
  });

  it("shows the final sku once created, dismissable", () => {
    render(<ReturnSubmitOverlay phase="succeeded" sku="RET-7" />);

    expect(screen.getByText("Return created")).toBeVisible();
    expect(
      screen.getByTestId("task-creation-submit-overlay-sku-value"),
    ).toHaveTextContent("RET-7");
  });

  it("forwards both exits once the return is created", () => {
    const onDismiss = vi.fn();
    const onCreateAnother = vi.fn();

    render(
      <ReturnSubmitOverlay
        onCreateAnother={onCreateAnother}
        onDismiss={onDismiss}
        phase="succeeded"
        sku="RET-7"
      />,
    );

    fireEvent.click(
      screen.getByTestId("task-creation-submit-overlay-back-button"),
    );
    fireEvent.click(
      screen.getByTestId(
        "task-creation-submit-overlay-create-another-button",
      ),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onCreateAnother).toHaveBeenCalledTimes(1);
  });
});
