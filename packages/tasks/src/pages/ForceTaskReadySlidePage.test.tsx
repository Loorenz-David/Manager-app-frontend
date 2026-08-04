import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForceTaskReadySlidePage } from "./ForceTaskReadySlidePage";

const mocks = vi.hoisted(() => ({
  requestClose: vi.fn(),
  submit: vi.fn(),
  controller: {} as Record<string, unknown>,
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    requestClose: mocks.requestClose,
    setTitle: vi.fn(),
    setActions: vi.fn(),
    setHeaderHidden: vi.fn(),
  }),
  useSurfaceProps: () => ({ taskId: "tsk_1" }),
}));

vi.mock("../providers/ForceTaskReadyProvider", () => ({
  ForceTaskReadyProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useForceTaskReadyContext: () => mocks.controller,
}));

function makeController(overrides: Record<string, unknown> = {}) {
  return {
    taskId: "tsk_1",
    task: { client_id: "tsk_1", state: "working" },
    steps: [
      {
        stepId: "tsp_1",
        sectionName: "Upholstery",
        imageUrl: null,
        state: "working",
        stateLabel: "Working",
        stateVariant: "active",
        sequenceOrder: 1,
      },
    ],
    stepCount: 1,
    isLoading: false,
    isError: false,
    canForce: true,
    isBlocked: false,
    blockedMessage: null,
    submit: mocks.submit,
    isSubmitting: false,
    errorMessage: null,
    ...overrides,
  };
}

async function confirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("force-task-ready-confirm-button"));
}

describe("ForceTaskReadySlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.controller = makeController();
  });

  it("states how many steps will be skipped", () => {
    render(<ForceTaskReadySlidePage />);

    expect(screen.getByTestId("force-task-ready-warning")).toHaveTextContent(
      "1 step will be skipped",
    );
    expect(
      screen.getByTestId("force-task-ready-step-box-tsp_1"),
    ).toHaveTextContent("Upholstery");
  });

  it("says the task will move straight to ready when nothing is open", () => {
    mocks.controller = makeController({ steps: [], stepCount: 0 });

    render(<ForceTaskReadySlidePage />);

    expect(screen.getByTestId("force-task-ready-warning")).toHaveTextContent(
      "No open steps to skip.",
    );
    expect(
      screen.getByTestId("force-task-ready-step-list-empty"),
    ).toBeInTheDocument();
  });

  it("will not submit without a reason", async () => {
    const user = userEvent.setup();
    render(<ForceTaskReadySlidePage />);

    expect(screen.getByTestId("force-task-ready-confirm-button")).toBeDisabled();

    await confirm(user);

    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("submits the reason with mark_inaccurate defaulted on", async () => {
    const user = userEvent.setup();
    render(<ForceTaskReadySlidePage />);

    expect(
      screen.getByTestId("force-task-ready-mark-inaccurate-switch"),
    ).toBeChecked();

    await user.type(
      screen.getByTestId("force-task-ready-reason-input"),
      "Customer withdrew the return.",
    );
    await confirm(user);

    expect(mocks.submit).toHaveBeenCalledWith({
      reason: "Customer withdrew the return.",
      markInaccurate: true,
    });
  });

  it("submits with the flag off once the toggle is turned off", async () => {
    const user = userEvent.setup();
    render(<ForceTaskReadySlidePage />);

    await user.type(
      screen.getByTestId("force-task-ready-reason-input"),
      "Work happened before the task existed.",
    );
    await user.click(
      screen.getByTestId("force-task-ready-mark-inaccurate-switch"),
    );
    await confirm(user);

    expect(mocks.submit).toHaveBeenCalledWith({
      reason: "Work happened before the task existed.",
      markInaccurate: false,
    });
  });

  it("keeps the page open and shows the server message on failure", () => {
    mocks.controller = makeController({
      errorMessage: "Task is already in a terminal state.",
    });

    render(<ForceTaskReadySlidePage />);

    expect(screen.getByTestId("force-task-ready-error")).toHaveTextContent(
      "Task is already in a terminal state.",
    );
    expect(
      screen.getByTestId("force-task-ready-reason-input"),
    ).toBeInTheDocument();
  });

  it("hides the form and blocks confirming when the task cannot move", () => {
    mocks.controller = makeController({
      isBlocked: true,
      blockedMessage: "This task is already ready or closed.",
    });

    render(<ForceTaskReadySlidePage />);

    expect(screen.getByTestId("force-task-ready-blocked")).toBeInTheDocument();
    expect(
      screen.queryByTestId("force-task-ready-reason-input"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("force-task-ready-confirm-button")).toBeDisabled();
  });

  it("tells a non-manager they cannot force the task ready", () => {
    mocks.controller = makeController({ canForce: false });

    render(<ForceTaskReadySlidePage />);

    expect(screen.getByTestId("force-task-ready-forbidden")).toBeInTheDocument();
    expect(screen.getByTestId("force-task-ready-confirm-button")).toBeDisabled();
  });

  it("closes the page from the footer back button", async () => {
    const user = userEvent.setup();
    render(<ForceTaskReadySlidePage />);

    await user.click(screen.getByTestId("force-task-ready-back-button"));

    expect(mocks.requestClose).toHaveBeenCalledTimes(1);
  });
});
