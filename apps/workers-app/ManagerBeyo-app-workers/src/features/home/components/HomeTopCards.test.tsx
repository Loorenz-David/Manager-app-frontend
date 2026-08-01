import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openSurface: vi.fn(),
  role: "worker" as string,
  shift: {
    data: undefined as unknown,
    isPending: false,
    isError: false,
  },
  count: { data: undefined as { total: number } | undefined, isPending: false },
}));

vi.mock("@beyo/auth", () => ({
  AuthRole: { Admin: "admin", Manager: "manager", Worker: "worker", Seller: "seller" },
  useRole: () => ({ role: mocks.role }),
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ open: mocks.openSurface }),
  usePreloadSurface: () => undefined,
}));

vi.mock("@beyo/worker-shifts", () => ({
  useMyCurrentShiftQuery: (enabled: boolean) =>
    enabled ? mocks.shift : { data: undefined, isPending: false, isError: false },
}));

vi.mock("@beyo/task-working-sections", () => ({
  REASSIGNED_STEPS_SLIDE_SURFACE_ID: "reassigned-steps-slide",
  useReassignedStepsCountQuery: () => mocks.count,
}));

vi.mock("@beyo/ui", () => ({
  BackendImage: ({ src }: { src: string | null }) =>
    createElement("img", { "data-testid": "backend-image", src: src ?? "" }),
  TickingTimer: ({ startedAtIso }: { startedAtIso: string }) =>
    createElement(
      "span",
      { "data-testid": "worker-state-card-timer" },
      startedAtIso,
    ),
}));

vi.mock("../../task_steps", () => ({
  ReassignedStepRow: () => createElement("div"),
}));

vi.mock("../surfaces", () => ({
  preloadWorkerStateSheetSurface: vi.fn(),
  preloadReassignedStepsSlideSurface: vi.fn(),
}));

const { HomeTopCards } = await import("./HomeTopCards");
const { HomeTopCardsProvider } = await import(
  "../providers/HomeTopCardsProvider"
);

function renderCards() {
  return render(
    <HomeTopCardsProvider>
      <HomeTopCards />
    </HomeTopCardsProvider>,
  );
}

const CLOCKED_IN_PAUSED = {
  user_id: "usr_1",
  clocked_in: true,
  shift_started_at: "2026-07-31T06:58:00+00:00",
  state: "in_pause",
  state_entered_at: "2026-07-31T09:12:00+00:00",
  pause_reason: {
    id: "par_lunch",
    name: "Lunch break",
    image_url: "https://cdn.example.com/lunch.png",
  },
  declared_state: null,
};

afterEach(() => {
  cleanup();
  mocks.openSurface.mockClear();
  mocks.role = "worker";
  mocks.shift = { data: undefined, isPending: false, isError: false };
  mocks.count = { data: undefined, isPending: false };
});

describe("HomeTopCards", () => {
  it("renders the state card, the Re-Assigned card and the My Sections label", () => {
    mocks.shift = {
      data: { ...CLOCKED_IN_PAUSED, state: "working", pause_reason: null },
      isPending: false,
      isError: false,
    };
    renderCards();

    expect(screen.getByTestId("worker-state-card")).toBeInTheDocument();
    expect(screen.getByTestId("reassigned-card")).toBeInTheDocument();
    expect(screen.getByText("My Sections")).toBeInTheDocument();
  });

  it("hides the state card for a manager-role session and never calls /current", () => {
    mocks.role = "manager";
    // The mocked hook returns an untouched result when `enabled` is false, which
    // is what the 403 trap (handoff §12.1) requires the app to do.
    renderCards();

    expect(screen.queryByTestId("worker-state-card")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("worker-state-card-loading"),
    ).not.toBeInTheDocument();
    // The reassigned card is personal-scope and still renders.
    expect(screen.getByTestId("reassigned-card")).toBeInTheDocument();
  });

  it("shows the pause reason name and a timer anchored to state_entered_at", () => {
    mocks.shift = { data: CLOCKED_IN_PAUSED, isPending: false, isError: false };
    renderCards();

    expect(screen.getByTestId("worker-state-card-label")).toHaveTextContent(
      "Lunch break",
    );
    expect(screen.getByTestId("worker-state-card-timer")).toHaveTextContent(
      "2026-07-31T09:12:00+00:00",
    );
    expect(screen.getByTestId("worker-state-card")).toHaveAttribute(
      "data-state",
      "paused",
    );
  });

  it("shows Working / Idle labels with no pause artwork", () => {
    mocks.shift = {
      data: { ...CLOCKED_IN_PAUSED, state: "idle", pause_reason: null },
      isPending: false,
      isError: false,
    };
    renderCards();

    expect(screen.getByTestId("worker-state-card-label")).toHaveTextContent(
      "Idle",
    );
    expect(screen.queryByTestId("backend-image")).not.toBeInTheDocument();
  });

  it("shows 'Clocked out' with no timer and does not open the picker", () => {
    mocks.shift = {
      data: {
        user_id: "usr_1",
        clocked_in: false,
        shift_started_at: null,
        state: null,
        state_entered_at: null,
        pause_reason: null,
        declared_state: null,
      },
      isPending: false,
      isError: false,
    };
    renderCards();

    const card = screen.getByTestId("worker-state-card");
    expect(screen.getByTestId("worker-state-card-label")).toHaveTextContent(
      "Clocked out",
    );
    expect(
      screen.queryByTestId("worker-state-card-timer"),
    ).not.toBeInTheDocument();
    expect(card).toBeDisabled();

    fireEvent.click(card);
    expect(mocks.openSurface).not.toHaveBeenCalled();
  });

  it("keeps a long pause-reason name reachable once the label is clipped", () => {
    const longName = "Waiting for the upholstery delivery from the supplier";
    mocks.shift = {
      data: {
        ...CLOCKED_IN_PAUSED,
        pause_reason: { id: "par_wait", name: longName, image_url: null },
      },
      isPending: false,
      isError: false,
    };
    renderCards();

    // The visible text is CSS-clipped in the half-width card, so the full
    // reason has to stay available rather than being silently lost.
    const label = screen.getByTestId("worker-state-card-label");
    expect(label).toHaveTextContent(longName);
    expect(label).toHaveAttribute("title", longName);
  });

  it("opens the worker-state sheet when a clocked-in worker taps the card", () => {
    mocks.shift = { data: CLOCKED_IN_PAUSED, isPending: false, isError: false };
    renderCards();

    fireEvent.click(screen.getByTestId("worker-state-card"));
    expect(mocks.openSurface).toHaveBeenCalledWith("worker-state-sheet", {});
  });

  it("hides the badge at zero and shows count.total above it", () => {
    mocks.count = { data: { total: 0 }, isPending: false };
    const { unmount } = renderCards();
    expect(
      screen.queryByTestId("reassigned-card-badge"),
    ).not.toBeInTheDocument();
    unmount();

    mocks.count = { data: { total: 7 }, isPending: false };
    renderCards();
    expect(screen.getByTestId("reassigned-card-badge")).toHaveTextContent("7");
  });

  it("opens the reassigned page with a StepRow component adapter", () => {
    mocks.count = { data: { total: 3 }, isPending: false };
    renderCards();

    fireEvent.click(screen.getByTestId("reassigned-card"));

    expect(mocks.openSurface).toHaveBeenCalledWith(
      "reassigned-steps-slide",
      expect.objectContaining({
        adapter: expect.objectContaining({ StepRow: expect.any(Function) }),
      }),
    );
  });
});
