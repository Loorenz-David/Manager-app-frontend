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

  it("offers no way out while creating", () => {
    render(
      <TaskCreationSubmitOverlay
        phase="creating"
        sku="PRE-ORDER-42"
        title="Creating pre-order and Shopify order…"
      />,
    );

    expect(
      screen.queryByTestId("task-creation-submit-overlay-actions"),
    ).not.toBeInTheDocument();
  });

  it("exits through the Back button as well as the backdrop", () => {
    const onDismiss = vi.fn();

    render(
      <TaskCreationSubmitOverlay
        onDismiss={onDismiss}
        phase="succeeded"
        sku="PRE-ORDER-42"
        title="Pre-order and Shopify order created"
      />,
    );

    fireEvent.click(
      screen.getByTestId("task-creation-submit-overlay-back-button"),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("only offers Back when the task is created but Shopify failed", () => {
    render(
      <TaskCreationSubmitOverlay
        onDismiss={vi.fn()}
        phase="failed"
        sku="PRE-ORDER-42"
        title="Pre-order created — Shopify order failed"
      />,
    );

    expect(
      screen.getByTestId("task-creation-submit-overlay-back-button"),
    ).toBeVisible();
    expect(
      screen.queryByTestId("task-creation-submit-overlay-create-another-button"),
    ).not.toBeInTheDocument();
  });

  it("runs create-another once, without also dismissing", () => {
    const onDismiss = vi.fn();
    const onCreateAnother = vi.fn();

    render(
      <TaskCreationSubmitOverlay
        onCreateAnother={onCreateAnother}
        onDismiss={onDismiss}
        phase="succeeded"
        sku="PRE-ORDER-42"
        title="Pre-order and Shopify order created"
      />,
    );

    fireEvent.click(
      screen.getByTestId(
        "task-creation-submit-overlay-create-another-button",
      ),
    );
    expect(onCreateAnother).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not dismiss when a key press comes from a button inside the card", () => {
    const onDismiss = vi.fn();

    render(
      <TaskCreationSubmitOverlay
        onCreateAnother={vi.fn()}
        onDismiss={onDismiss}
        phase="succeeded"
        sku="PRE-ORDER-42"
        title="Pre-order and Shopify order created"
      />,
    );

    fireEvent.keyDown(
      screen.getByTestId(
        "task-creation-submit-overlay-create-another-button",
      ),
      { key: "Enter" },
    );
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId("task-creation-submit-overlay"), {
      key: "Enter",
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
