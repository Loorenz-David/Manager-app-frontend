import { http, HttpResponse } from "msw";
import {
  ClockInInputSchema,
  ClockOutInputSchema,
  CloseDeclaredStateInputSchema,
  DeclareStateInputSchema,
  type CurrentShift,
} from "../types";
import {
  MOCK_CLOCKED_IN_USER_ID,
  MOCK_CLOCKED_OUT_USER_ID,
  MOCK_DECLARED_USER_ID,
  mockClockedInCurrentShift,
  mockClockedOutCurrentShift,
  mockClockOutAnalytics,
  mockDeclaredCurrentShift,
  mockFloorRoster,
} from "./fixtures";

const mockReasons = {
  par_lunch: {
    id: "par_lunch",
    name: "Lunch break",
    image_url: "https://example.com/lunch.png",
    pause_type: "personal",
    requires_description: false,
  },
  par_cleaning: {
    id: "par_cleaning",
    name: "Cleaning",
    image_url: null,
    pause_type: "personal",
    requires_description: true,
  },
  par_blocker: {
    id: "par_blocker",
    name: "Waiting for material",
    image_url: "https://example.com/blocker.png",
    pause_type: "blocker",
    requires_description: false,
  },
};

/** Which fixture a `user_id`-less (worker-token self) request resolves to. */
const MOCK_SELF_USER_ID = MOCK_CLOCKED_IN_USER_ID;

let stateByUserId: Record<string, CurrentShift>;
let declarationSequence = 0;

function cloneShift(shift: CurrentShift): CurrentShift {
  return structuredClone(shift);
}

export function resetWorkerShiftMockState(): void {
  stateByUserId = {
    [MOCK_CLOCKED_IN_USER_ID]: cloneShift(mockClockedInCurrentShift),
    [MOCK_CLOCKED_OUT_USER_ID]: cloneShift(mockClockedOutCurrentShift),
    [MOCK_DECLARED_USER_ID]: cloneShift(mockDeclaredCurrentShift),
  };
  declarationSequence = 0;
}

resetWorkerShiftMockState();

function success(data: unknown) {
  return HttpResponse.json({ ok: true, warnings: [], data });
}

function failure(status: number, error: string) {
  return HttpResponse.json({ ok: false, error }, { status });
}

function target(user_id: string): CurrentShift | null {
  return stateByUserId[user_id] ?? null;
}

export const workerShiftMockHandlers = [
  http.get("*/api/v1/users", () =>
    success({
      users: mockFloorRoster,
    }),
  ),

  http.get("*/api/v1/worker-shifts/current", ({ request }) => {
    const user_id = new URL(request.url).searchParams.get("user_id");
    // No user_id = the worker-token self read (handoff §12.1). The mock resolves
    // it to the clocked-in fixture; a manager token would get a 403 here.
    const shift =
      user_id === null
        ? target(MOCK_SELF_USER_ID)
        : target(user_id);

    return shift === null
      ? failure(404, "Worker was not found.")
      : success(shift);
  }),

  http.post("*/api/v1/worker-shifts/clock-in", async ({ request }) => {
    const parsed = ClockInInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(422, "Invalid clock-in request.");
    }

    const shift = target(parsed.data.user_id);
    if (shift === null) {
      return failure(404, "Worker was not found.");
    }
    if (shift.clocked_in) {
      return failure(409, "Worker is already clocked in.");
    }

    stateByUserId[parsed.data.user_id] = {
      user_id: parsed.data.user_id,
      clocked_in: true,
      shift_started_at: "2026-07-29T10:30:00Z",
      state: "idle",
      state_entered_at: "2026-07-29T10:30:00Z",
      pause_reason: null,
      declared_state: null,
    };

    return success({ action: "clock_in", user_id: parsed.data.user_id });
  }),

  http.post("*/api/v1/worker-shifts/clock-out", async ({ request }) => {
    const parsed = ClockOutInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return failure(422, "Invalid clock-out request.");
    }

    const shift = target(parsed.data.user_id);
    if (shift === null) {
      return failure(404, "Worker was not found.");
    }
    if (!shift.clocked_in) {
      return failure(409, "Worker is not clocked in.");
    }

    stateByUserId[parsed.data.user_id] = {
      user_id: parsed.data.user_id,
      clocked_in: false,
      shift_started_at: null,
      state: null,
      state_entered_at: null,
      pause_reason: null,
      declared_state: null,
    };

    const hasPopulatedAnalytics =
      parsed.data.user_id === MOCK_CLOCKED_IN_USER_ID;

    return success({
      action: "clock_out",
      user_id: parsed.data.user_id,
      transitioned_steps: hasPopulatedAnalytics ? 2 : 0,
      analytics: hasPopulatedAnalytics ? mockClockOutAnalytics : null,
    });
  }),

  http.post(
    "*/api/v1/worker-shifts/declared-states",
    async ({ request }) => {
      const parsed = DeclareStateInputSchema.safeParse(await request.json());
      if (!parsed.success) {
        return failure(422, "Invalid declared-state request.");
      }

      // Worker tokens omit user_id — resolve to the self fixture (handoff §12.5).
      const targetUserId = parsed.data.user_id ?? MOCK_SELF_USER_ID;
      const shift = target(targetUserId);
      if (shift === null) {
        return failure(404, "Worker was not found.");
      }
      if (!shift.clocked_in) {
        return failure(
          409,
          "Worker must be clocked in to declare a state.",
        );
      }

      const reason = Object.values(mockReasons).find(
        ({ id }) => id === parsed.data.pause_reason_id,
      );
      if (reason === undefined) {
        return failure(404, "Pause reason was not found.");
      }
      if (reason.pause_type !== "personal") {
        return failure(422, "Only personal pause reasons can be declared.");
      }
      if (
        reason.requires_description &&
        !parsed.data.description?.trim()
      ) {
        return failure(422, "Description is required.");
      }

      declarationSequence += 1;
      const declared_state = {
        id: `uds_mock_${declarationSequence}`,
        pause_reason: {
          id: reason.id,
          name: reason.name,
          image_url: reason.image_url,
        },
        description: parsed.data.description ?? null,
        entered_at: "2026-07-29T10:00:00Z",
      };

      stateByUserId[targetUserId] = {
        ...shift,
        state: "in_pause",
        state_entered_at: declared_state.entered_at,
        pause_reason: declared_state.pause_reason,
        declared_state,
      };

      return success({
        declared_state,
        shift_state: "in_pause",
        paused_steps: targetUserId === MOCK_CLOCKED_IN_USER_ID ? 1 : 0,
      });
    },
  ),

  http.post(
    "*/api/v1/worker-shifts/declared-states/close",
    async ({ request }) => {
      const parsed = CloseDeclaredStateInputSchema.safeParse(
        await request.json(),
      );
      if (!parsed.success) {
        return failure(422, "Invalid close-declared-state request.");
      }

      const shift = target(parsed.data.user_id);
      if (shift === null) {
        return failure(404, "Worker was not found.");
      }
      if (shift.declared_state === null) {
        return failure(409, "No declared state is open.");
      }

      const closed_declared_state_id = shift.declared_state.id;
      stateByUserId[parsed.data.user_id] = {
        ...shift,
        state: "idle",
        state_entered_at: "2026-07-29T10:05:00Z",
        pause_reason: null,
        declared_state: null,
      };

      return success({
        shift_state: "idle",
        closed_declared_state_id,
      });
    },
  ),
];
