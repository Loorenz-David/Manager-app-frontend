import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  declareState: vi.fn(),
  requestClose: vi.fn(),
  invalidateQueries: vi.fn(),
  refetchReasons: vi.fn(),
  reasonsParams: undefined as unknown,
}));

// Plain fields, not constructor parameter properties — the app tsconfig sets
// `erasableSyntaxOnly`.
class MockApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const reasons = [
  {
    client_id: "par_lunch",
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
    client_id: "par_cleaning",
    name: "Cleaning",
    image_url: null,
    pause_type: "personal" as const,
    description: null,
    requires_description: true,
    is_system_managed: false,
    slug: "pause_cleaning",
    created_at: "2026-07-22T12:00:00+00:00",
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
}));

vi.mock("@beyo/api-client", () => ({
  ApiRequestError: MockApiRequestError,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@beyo/pause-reasons", () => ({
  usePauseReasonsQuery: (params: unknown) => {
    mocks.reasonsParams = params;
    return {
      data: { pause_reasons: reasons },
      isPending: false,
      isError: false,
      refetch: mocks.refetchReasons,
    };
  },
  PauseReasonPicker: ({
    onSelect,
  }: {
    onSelect: (reason: (typeof reasons)[number]) => void;
  }) =>
    createElement(
      "div",
      { "data-testid": "worker-state-reason-picker" },
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

vi.mock("@beyo/worker-shifts", () => ({
  WORKER_SHIFT_SELF_SCOPE: "me",
  workerShiftKeys: {
    current: (params: { user_id: string }) => [
      "worker-shifts",
      "current",
      "list",
      params,
    ],
  },
  useDeclareState: () => ({
    declareState: mocks.declareState,
    isPending: false,
  }),
}));

const { WorkerStateSheetPage } = await import("./WorkerStateSheetPage");

afterEach(() => {
  cleanup();
  mocks.declareState.mockReset();
  mocks.requestClose.mockClear();
  mocks.invalidateQueries.mockClear();
  mocks.refetchReasons.mockClear();
});

describe("WorkerStateSheetPage", () => {
  it("loads only declarable (personal) reasons", () => {
    render(<WorkerStateSheetPage />);
    expect(mocks.reasonsParams).toEqual({ pause_type: "personal" });
  });

  it("declares without user_id and closes on success", async () => {
    mocks.declareState.mockImplementation((_input, opts) => {
      opts?.onSuccess?.({ paused_steps: 0 });
    });

    render(<WorkerStateSheetPage />);
    fireEvent.click(screen.getByTestId("picker-pause_lunch_break"));

    // Worker token: user_id is omitted entirely (handoff §12.1).
    expect(mocks.declareState).toHaveBeenCalledWith(
      { pause_reason_id: "par_lunch" },
      expect.anything(),
    );
    expect(mocks.declareState.mock.calls[0]?.[0]).not.toHaveProperty("user_id");
    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
  });

  it("shows a description step for a reason that requires one", () => {
    render(<WorkerStateSheetPage />);
    fireEvent.click(screen.getByTestId("picker-pause_cleaning"));

    // Nothing is sent until the description is supplied.
    expect(mocks.declareState).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("worker-state-description-input"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("worker-state-submit-button")).toBeDisabled();
  });

  it("sends the trimmed description once entered", () => {
    render(<WorkerStateSheetPage />);
    fireEvent.click(screen.getByTestId("picker-pause_cleaning"));
    fireEvent.change(screen.getByTestId("worker-state-description-input"), {
      target: { value: "  Sweeping the bay  " },
    });
    fireEvent.click(screen.getByTestId("worker-state-submit-button"));

    expect(mocks.declareState).toHaveBeenCalledWith(
      { pause_reason_id: "par_cleaning", description: "Sweeping the bay" },
      expect.anything(),
    );
  });

  it("invalidates shift, section lists and last-active on success", async () => {
    mocks.declareState.mockImplementation((_input, opts) => {
      opts?.onSuccess?.({ paused_steps: 2 });
    });

    render(<WorkerStateSheetPage />);
    fireEvent.click(screen.getByTestId("picker-pause_lunch_break"));

    await waitFor(() =>
      expect(mocks.invalidateQueries).toHaveBeenCalledTimes(3),
    );
    const keys = mocks.invalidateQueries.mock.calls.map(
      (call) => JSON.stringify(call[0]?.queryKey),
    );
    expect(keys[0]).toContain('"me"');
    expect(keys[1]).toContain("section-list");
    expect(keys[2]).toContain("user-last-active");
  });

  it("treats a 409 as normal flow — refetch and close, no error shown", async () => {
    mocks.declareState.mockImplementation((_input, opts) => {
      opts?.onError?.(
        new MockApiRequestError(
          409,
          "conflict",
          "Worker must be clocked in to declare a state.",
        ),
      );
    });

    render(<WorkerStateSheetPage />);
    fireEvent.click(screen.getByTestId("picker-pause_lunch_break"));

    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(screen.queryByTestId("worker-state-error")).not.toBeInTheDocument();
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("surfaces a defensive inline error and refreshes the reason list on 422", async () => {
    mocks.declareState.mockImplementation((_input, opts) => {
      opts?.onError?.(
        new MockApiRequestError(
          422,
          "unprocessable",
          "Only personal pause reasons can be declared.",
        ),
      );
    });

    render(<WorkerStateSheetPage />);
    fireEvent.click(screen.getByTestId("picker-pause_lunch_break"));

    await waitFor(() =>
      expect(screen.getByTestId("worker-state-error")).toHaveTextContent(
        "Only personal pause reasons can be declared.",
      ),
    );
    expect(mocks.refetchReasons).toHaveBeenCalled();
    expect(mocks.requestClose).not.toHaveBeenCalled();
  });
});
