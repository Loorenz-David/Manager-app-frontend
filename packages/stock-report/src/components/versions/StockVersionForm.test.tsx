import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StockVersionFormOriginal } from "../../lib/version-form";
import { StockVersionForm } from "./StockVersionForm";

afterEach(cleanup);

const NOW = new Date(2026, 9, 1, 12, 0).getTime();
const LATER = new Date(2026, 9, 7, 6, 0).toISOString();

function draft(overrides: Partial<StockVersionFormOriginal> = {}): StockVersionFormOriginal {
  return { state: "draft", title: "Autumn run", scheduledAt: null, keepActiveMissing: false, createdAt: new Date(2026, 8, 20).toISOString(), ...overrides };
}

function renderForm(original: StockVersionFormOriginal | null = null) {
  const onSubmit = vi.fn();
  const onOpenSchedule = vi.fn();
  render(<StockVersionForm now={NOW} original={original} onOpenSchedule={onOpenSchedule} onSubmit={onSubmit} />);
  return { onSubmit, onOpenSchedule };
}

describe("StockVersionForm", () => {
  it("offers the creation day as the title placeholder and starts as a draft", () => {
    renderForm();
    expect(screen.getByTestId("stock-version-form-title")).toHaveAttribute("placeholder", "Thu, 1st October");
    expect(screen.getByTestId("stock-version-form-state-draft")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("stock-version-form-submit")).toHaveTextContent("Create draft");
  });

  /** Projection R2: the hidden schedule is cleared in form state, not just hidden. */
  it("hides the schedule on Active and clears it", async () => {
    const { onOpenSchedule, onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId("stock-version-form-schedule"));
    const apply = onOpenSchedule.mock.calls[0]?.[1] as (iso: string | null) => void;
    expect(onOpenSchedule.mock.calls[0]?.[0]).toBeNull();
    act(() => apply(LATER));
    expect(screen.getByTestId("stock-version-form-schedule")).toHaveTextContent("Wed, 7th Oct · 06:00");

    fireEvent.click(screen.getByTestId("stock-version-form-state-active"));
    expect(screen.queryByTestId("stock-version-form-schedule")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("stock-version-form-state-draft"));
    expect(screen.getByTestId("stock-version-form-schedule")).toHaveTextContent("No scheduled activation");

    fireEvent.submit(screen.getByTestId("stock-version-form"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ state: "draft", title: "", scheduledAt: null });
  });

  it("marks a stored schedule in the past as overdue, and still saves it untouched", async () => {
    const past = new Date(2026, 8, 28, 6, 0).toISOString();
    const { onSubmit } = renderForm(draft({ scheduledAt: past }));
    expect(screen.getByTestId("stock-version-form-overdue")).toHaveTextContent("Overdue");

    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: "Retitled" } });
    fireEvent.submit(screen.getByTestId("stock-version-form"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ title: "Retitled", scheduledAt: past });
  });

  it("locks both state options when editing an active version", () => {
    renderForm(draft({ state: "active" }));
    expect(screen.getByTestId("stock-version-form-state-active")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("stock-version-form-state-draft")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("stock-version-form-state-active")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByTestId("stock-version-form-schedule")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-version-form-submit")).toHaveTextContent("Save changes");
  });

  /** Projection R15: the promote confirms once, in the activation sheet; only the direct active create asks twice. */
  it("submits a promote with a plain button and an active create only on the second tap", async () => {
    const promote = renderForm(draft());
    fireEvent.click(screen.getByTestId("stock-version-form-state-active"));
    const submit = screen.getByTestId("stock-version-form-submit");
    expect(submit).toHaveTextContent("Publish this draft");
    expect(submit).toHaveAttribute("type", "submit");
    fireEvent.click(submit);
    await waitFor(() => expect(promote.onSubmit).toHaveBeenCalledTimes(1));

    cleanup();
    const create = renderForm();
    fireEvent.click(screen.getByTestId("stock-version-form-state-active"));
    expect(screen.getByTestId("stock-version-form-submit")).toHaveTextContent("Create active version");
    fireEvent.click(screen.getByTestId("stock-version-form-submit"));
    await Promise.resolve();
    expect(create.onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("stock-version-form-submit"));
    await waitFor(() => expect(create.onSubmit).toHaveBeenCalledTimes(1));
    expect(create.onSubmit.mock.calls[0]?.[0]).toEqual({ state: "active", title: "", scheduledAt: null });
  });

  it("shows a validation message and does not submit a title over 200 characters", async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: "a".repeat(201) } });
    fireEvent.submit(screen.getByTestId("stock-version-form"));
    expect(await screen.findByTestId("stock-version-form-title-error")).toHaveTextContent("At most 200 characters.");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
