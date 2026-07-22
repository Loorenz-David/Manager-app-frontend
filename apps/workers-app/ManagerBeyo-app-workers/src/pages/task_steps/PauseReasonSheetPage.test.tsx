import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PauseReasonSheetPage } from "./PauseReasonSheetPage";

const mocks = vi.hoisted(() => ({
  transition: vi.fn(),
  requestClose: vi.fn(),
}));

const reasons = [
  {
    client_id: "par_plain",
    name: "Lunch break",
    image_url: null,
    pause_type: "personal" as const,
    description: null,
    requires_description: false,
    is_system_managed: false,
    slug: "pause_lunch_break",
    created_at: "2026-07-22T11:00:00+00:00",
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  },
  {
    client_id: "par_description",
    name: "Supplier call",
    image_url: null,
    pause_type: "blocker" as const,
    description: null,
    requires_description: true,
    is_system_managed: false,
    slug: "pause_supplier_call",
    created_at: "2026-07-22T12:00:00+00:00",
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  },
  {
    client_id: "par_ended",
    name: "Ended shift",
    image_url: null,
    pause_type: "personal" as const,
    description: null,
    requires_description: false,
    is_system_managed: true,
    slug: "pause_ended_shift",
    created_at: "2026-07-22T13:00:00+00:00",
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  },
];

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ closeTop: vi.fn() }),
  useSurfaceHeader: () => ({
    setTitle: vi.fn(),
    setActions: vi.fn(),
    requestClose: mocks.requestClose,
  }),
  useSurfaceProps: () => ({
    stepId: "tsp_step",
    taskId: "tsk_task",
    workingSectionId: "wks_section",
  }),
}));

vi.mock("@beyo/pause-reasons", () => ({
  usePauseReasonsQuery: () => ({
    data: { pause_reasons: reasons },
    isPending: false,
    isError: false,
  }),
  PauseReasonPicker: ({
    onSelect,
  }: {
    onSelect: (reason: (typeof reasons)[number]) => void;
  }) =>
    createElement(
      "div",
      { "data-testid": "pause-reason-picker" },
      reasons.map((reason) =>
        createElement(
          "button",
          {
            key: reason.client_id,
            "data-testid": `picker-${reason.slug}`,
            onClick: () => onSelect(reason),
            type: "button",
          },
          reason.name,
        ),
      ),
    ),
}));

vi.mock("@/features/task_steps/actions/use-transition-step-state", () => ({
  useTransitionStepState: () => ({
    transitionStepState: mocks.transition,
    isPending: false,
  }),
}));

afterEach(() => {
  cleanup();
  mocks.transition.mockClear();
  mocks.requestClose.mockClear();
});

describe("PauseReasonSheetPage", () => {
  it("sends a plain reason ID and paused state", () => {
    render(<PauseReasonSheetPage />);

    fireEvent.click(screen.getByTestId("picker-pause_lunch_break"));

    expect(mocks.transition).toHaveBeenCalledWith({
      task_id: "tsk_task",
      step_id: "tsp_step",
      new_state: "paused",
      pause_reason_id: "par_plain",
      working_section_id: "wks_section",
    });
  });

  it("requires a non-blank description before transitioning", () => {
    render(<PauseReasonSheetPage />);

    fireEvent.click(screen.getByTestId("picker-pause_supplier_call"));
    const submit = screen.getByTestId("pause-reason-submit-button");
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId("pause-reason-description-input"), {
      target: { value: "  Waiting for supplier  " },
    });
    fireEvent.click(submit);

    expect(mocks.transition).toHaveBeenCalledWith({
      task_id: "tsk_task",
      step_id: "tsp_step",
      new_state: "paused",
      pause_reason_id: "par_description",
      description: "Waiting for supplier",
      working_section_id: "wks_section",
    });
  });

  it("maps the reserved ended-shift slug to ended_shift", () => {
    render(<PauseReasonSheetPage />);

    fireEvent.click(screen.getByTestId("picker-pause_ended_shift"));

    expect(mocks.transition).toHaveBeenCalledWith({
      task_id: "tsk_task",
      step_id: "tsp_step",
      new_state: "ended_shift",
      pause_reason_id: "par_ended",
      working_section_id: "wks_section",
    });
  });
});
