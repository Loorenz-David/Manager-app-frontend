import type {
  ClockOutAnalytics,
  CurrentShift,
  FloorRosterUser,
} from '@beyo/worker-shifts';
import { createStore } from 'zustand/vanilla';

export type KioskResult =
  | {
      kind: 'clock_in';
      current: CurrentShift;
    }
  | {
      kind: 'clock_out';
      current: CurrentShift;
      transitionedSteps: number;
      analytics: ClockOutAnalytics | null;
    };

export type KeypadFlowState = {
  step: 'keypad';
  sessionId: string;
  code: string;
  email: string;
  mode: 'code' | 'email';
  error: boolean;
  matching: boolean;
};

export type ConfirmingFlowState = {
  step: 'confirming';
  sessionId: string;
  user: FloorRosterUser;
  current: CurrentShift | null;
  actionFailed: boolean;
};

export type ActingFlowState = {
  step: 'acting';
  sessionId: string;
  user: FloorRosterUser;
  current: CurrentShift;
};

export type ResultFlowState = {
  step: 'result';
  sessionId: string;
  user: FloorRosterUser;
  result: KioskResult;
  countdownSeconds: number;
};

export type KioskFlowState =
  | KeypadFlowState
  | ConfirmingFlowState
  | ActingFlowState
  | ResultFlowState;

export type KioskFlowStore = {
  flow: KioskFlowState;
  setCode: (sessionId: string, code: string) => void;
  setEmail: (sessionId: string, email: string) => void;
  setMode: (sessionId: string, mode: 'code' | 'email') => void;
  beginMatch: (sessionId: string) => boolean;
  rejectMatch: (sessionId: string) => void;
  beginConfirm: (sessionId: string, user: FloorRosterUser) => void;
  resolveConfirm: (sessionId: string, current: CurrentShift) => void;
  failAction: (sessionId: string) => void;
  beginActing: (sessionId: string) => boolean;
  showResult: (
    sessionId: string,
    result: KioskResult,
    countdownSeconds: number,
  ) => void;
  tickResult: (sessionId: string) => number | null;
  reset: () => string;
};

function createSessionId(): string {
  return crypto.randomUUID();
}

function createKeypadState(sessionId = createSessionId()): KeypadFlowState {
  return {
    step: 'keypad',
    sessionId,
    code: '',
    email: '',
    mode: 'code',
    error: false,
    matching: false,
  };
}

export function createKioskFlowStore() {
  return createStore<KioskFlowStore>()((set, get) => ({
    flow: createKeypadState(),

    setCode: (sessionId, code) =>
      set((state) =>
        state.flow.step === 'keypad' &&
        state.flow.sessionId === sessionId &&
        !state.flow.matching
          ? {
              flow: {
                ...state.flow,
                code: code.slice(0, 4),
                error: false,
              },
            }
          : state,
      ),

    setEmail: (sessionId, email) =>
      set((state) =>
        state.flow.step === 'keypad' &&
        state.flow.sessionId === sessionId &&
        !state.flow.matching
          ? {
              flow: {
                ...state.flow,
                email,
                error: false,
              },
            }
          : state,
      ),

    setMode: (sessionId, mode) =>
      set((state) =>
        state.flow.step === 'keypad' &&
        state.flow.sessionId === sessionId &&
        !state.flow.matching
          ? {
              flow: {
                ...state.flow,
                code: '',
                email: '',
                mode,
                error: false,
              },
            }
          : state,
      ),

    beginMatch: (sessionId) => {
      const { flow } = get();
      if (
        flow.step !== 'keypad' ||
        flow.sessionId !== sessionId ||
        flow.matching
      ) {
        return false;
      }
      set({ flow: { ...flow, matching: true, error: false } });
      return true;
    },

    rejectMatch: (sessionId) =>
      set((state) =>
        state.flow.step === 'keypad' &&
        state.flow.sessionId === sessionId
          ? {
              flow: {
                ...state.flow,
                code: '',
                email: '',
                error: true,
                matching: false,
              },
            }
          : state,
      ),

    beginConfirm: (sessionId, user) =>
      set((state) =>
        state.flow.step === 'keypad' &&
        state.flow.sessionId === sessionId
          ? {
              flow: {
                step: 'confirming',
                sessionId,
                user,
                current: null,
                actionFailed: false,
              },
            }
          : state,
      ),

    resolveConfirm: (sessionId, current) =>
      set((state) =>
        (state.flow.step === 'confirming' ||
          state.flow.step === 'acting') &&
        state.flow.sessionId === sessionId
          ? {
              flow: {
                step: 'confirming',
                sessionId,
                user: state.flow.user,
                current,
                actionFailed: false,
              },
            }
          : state,
      ),

    failAction: (sessionId) =>
      set((state) =>
        (state.flow.step === 'confirming' ||
          state.flow.step === 'acting') &&
        state.flow.sessionId === sessionId
          ? {
              flow: {
                step: 'confirming',
                sessionId,
                user: state.flow.user,
                current: state.flow.current,
                actionFailed: true,
              },
            }
          : state,
      ),

    beginActing: (sessionId) => {
      const { flow } = get();
      if (
        flow.step !== 'confirming' ||
        flow.sessionId !== sessionId ||
        !flow.current
      ) {
        return false;
      }
      set({
        flow: {
          step: 'acting',
          sessionId,
          user: flow.user,
          current: flow.current,
        },
      });
      return true;
    },

    showResult: (sessionId, result, countdownSeconds) =>
      set((state) =>
        state.flow.step === 'acting' &&
        state.flow.sessionId === sessionId
          ? {
              flow: {
                step: 'result',
                sessionId,
                user: state.flow.user,
                result,
                countdownSeconds,
              },
            }
          : state,
      ),

    tickResult: (sessionId) => {
      const { flow } = get();
      if (flow.step !== 'result' || flow.sessionId !== sessionId) {
        return null;
      }
      const countdownSeconds = Math.max(0, flow.countdownSeconds - 1);
      set({ flow: { ...flow, countdownSeconds } });
      return countdownSeconds;
    },

    reset: () => {
      const sessionId = createSessionId();
      set({ flow: createKeypadState(sessionId) });
      return sessionId;
    },
  }));
}

export type KioskFlowStoreApi = ReturnType<typeof createKioskFlowStore>;
