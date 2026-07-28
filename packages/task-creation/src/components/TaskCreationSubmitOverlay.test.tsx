import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskCreationSubmitOverlay } from "./TaskCreationSubmitOverlay";

describe("TaskCreationSubmitOverlay", () => {
  it("shows the submitted SKU while Shopify is creating the order", () => {
    render(
      <TaskCreationSubmitOverlay
        phase="creating"
        sku="PRE-ORDER-42"
        title="Creating pre-order and Shopify order…"
      />,
    );

    expect(screen.getByText("SKU:")).toBeVisible();
    expect(
      screen.getByTestId("task-creation-submit-overlay-sku-value"),
    ).toHaveTextContent("PRE-ORDER-42");
    expect(
      screen.getByTestId("task-creation-submit-overlay-sku-value"),
    ).toHaveClass("text-lg", "font-bold");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the completed SKU visible and dismisses only from the backdrop", () => {
    const onDismiss = vi.fn();

    render(
      <TaskCreationSubmitOverlay
        onDismiss={onDismiss}
        phase="succeeded"
        sku="PRE-ORDER-42"
        title="Pre-order and Shopify order created"
      />,
    );

    expect(
      screen.getByTestId("task-creation-submit-overlay-sku-value"),
    ).toHaveTextContent("PRE-ORDER-42");

    fireEvent.click(
      screen.getByText("Pre-order and Shopify order created"),
    );
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByTestId("task-creation-submit-overlay"),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
