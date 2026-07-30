import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  CurrentShift,
  FloorRosterUser,
} from '@beyo/worker-shifts';
import { ApiRequestError } from '@beyo/api-client';
import { createKioskFlowStore } from '../store/kiosk-flow.store';
import type { KioskAdapters } from '../types';
import {
  goodDayPartGreeting,
  isEditableEventTarget,
  roleLine,
  useKioskFlowController,
} from './use-kiosk-flow.controller';

const mocks = vi.hoisted(() => ({
  fetchCurrentShift: vi.fn(),
  matchWorker: vi.fn(),
  clockInAsync: vi.fn(),
  clockOutAsync: vi.fn(),
  clockInReset: vi.fn(),
  clockOutReset: vi.fn(),
  rosterState: {
    data: [] as FloorRosterUser[],
    isError: false,
    isPending: false,
  },
}));

vi.mock('@beyo/worker-shifts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@beyo/worker-shifts')>();
  return {
    ...actual,
    fetchCurrentShift: mocks.fetchCurrentShift,
    matchWorker: mocks.matchWorker,
    useClockIn: () => ({
      clockInAsync: mocks.clockInAsync,
      isPending: false,
      error: null,
      reset: mocks.clockInReset,
    }),
    useClockOut: () => ({
      clockOutAsync: mocks.clockOutAsync,
      isPending: false,
      error: null,
      reset: mocks.clockOutReset,
    }),
    useFloorRosterQuery: () => ({
      data: mocks.rosterState.data,
      isError: mocks.rosterState.isError,
      isPending: mocks.rosterState.isPending,
    }),
  };
});

const user: FloorRosterUser = {
  client_id: 'usr_controller',
  username: 'Marco Silva',
  profile_picture: null,
  role: { name: 'Assembly' },
  clock_in_code: '4821',
  email: 'marco@example.com',
};

const clockedOut: CurrentShift = {
  user_id: user.client_id,
  clocked_in: false,
  shift_started_at: null,
  state: null,
  state_entered_at: null,
  pause_reason: null,
  declared_state: null,
};

const clockedIn: CurrentShift = {
  ...clockedOut,
  clocked_in: true,
  shift_started_at: '2026-07-29T06:58:00.000Z',
  state: 'idle',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function setup(store = createKioskFlowStore()) {
  const surfaceOpeners = {
    openIdentityConfirm: vi.fn(),
    openResult: vi.fn(),
    closeKioskSurfaces: vi.fn(),
  };
  const scheduledShift = vi.fn<KioskAdapters['scheduledShift']>(
    () => null,
  );
  const adapters = {
    scheduledShift,
    announcements: vi.fn(() => []),
    summaryExtras: {
      items: vi.fn(() => null),
      week: vi.fn(() => null),
      rate: vi.fn(() => null),
    },
  };
  const rendered = renderHook(() =>
    useKioskFlowController({
      store,
      surfaceOpeners,
      adapters,
      autoReturnSeconds: 4,
      timeZone: 'Europe/Stockholm',
    }),
  );
  return {
    store,
    surfaceOpeners,
    adapters,
    scheduledShift,
    ...rendered,
  };
}

describe('useKioskFlowController', () => {
  beforeEach(() => {
    mocks.fetchCurrentShift.mockReset();
    mocks.matchWorker.mockReset();
    mocks.clockInAsync.mockReset();
    mocks.clockOutAsync.mockReset();
    mocks.clockInReset.mockReset();
    mocks.clockOutReset.mockReset();
    mocks.rosterState.data = [user];
    mocks.rosterState.isError = false;
    mocks.rosterState.isPending = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('wires fourth-digit local matching to a fresh current-state read', async () => {
    mocks.matchWorker.mockReturnValue(user);
    mocks.fetchCurrentShift.mockResolvedValue(clockedOut);
    const { result, store, surfaceOpeners } = setup();

    act(() => {
      result.current.keypad?.onDigit('4');
      result.current.keypad?.onDigit('8');
      result.current.keypad?.onDigit('2');
      result.current.keypad?.onDigit('1');
    });

    await waitFor(() => {
      expect(store.getState().flow).toMatchObject({
        step: 'confirming',
        current: clockedOut,
      });
    });
    expect(mocks.matchWorker).toHaveBeenCalledWith([user], '4821');
    expect(mocks.fetchCurrentShift).toHaveBeenCalledWith(user.client_id);
    expect(surfaceOpeners.openIdentityConfirm).toHaveBeenCalled();
    expect(result.current.confirm?.action).toBe('clock_in');
  });

  it('drops a fresh-current response after reset invalidates its session', async () => {
    const pendingCurrent = deferred<CurrentShift>();
    mocks.matchWorker.mockReturnValue(user);
    mocks.fetchCurrentShift.mockReturnValue(pendingCurrent.promise);
    const { result, store, surfaceOpeners } = setup();

    act(() => {
      result.current.keypad?.onDigit('4');
      result.current.keypad?.onDigit('8');
      result.current.keypad?.onDigit('2');
      result.current.keypad?.onDigit('1');
    });
    const matchedSessionId = store.getState().flow.sessionId;
    expect(result.current.confirm).toMatchObject({
      pending: true,
      action: 'clock_in',
    });

    act(() => result.current.returnToKeypad());
    await act(async () => {
      pendingCurrent.resolve(clockedIn);
      await pendingCurrent.promise;
    });
    await waitFor(() => {
      expect(store.getState().flow.step).toBe('keypad');
    });
    const resetSessionId = store.getState().flow.sessionId;

    expect(resetSessionId).not.toBe(matchedSessionId);
    expect(store.getState().flow).toMatchObject({
      step: 'keypad',
      sessionId: resetSessionId,
      code: '',
      email: '',
    });
    expect(surfaceOpeners.closeKioskSurfaces).toHaveBeenCalledOnce();
  });

  it('treats 409 as a fresh state correction and renders one corrected action', async () => {
    mocks.clockInAsync.mockRejectedValue(
      new ApiRequestError(409, 'conflict', 'Already clocked in'),
    );
    mocks.fetchCurrentShift.mockResolvedValue(clockedIn);
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    const { result, surfaceOpeners } = setup(store);

    await act(async () => {
      result.current.confirm?.onAction();
    });

    await waitFor(() => {
      expect(result.current.confirm?.action).toBe('clock_out');
    });
    expect(result.current.flow.step).toBe('confirming');
    expect(surfaceOpeners.closeKioskSurfaces).not.toHaveBeenCalled();
    expect(surfaceOpeners.openResult).not.toHaveBeenCalled();
  });

  it('keeps result content through the rise exit, then clears personal and mutation state', () => {
    vi.useFakeTimers();
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    store.getState().beginActing(sessionId);
    store
      .getState()
      .showResult(
        sessionId,
        {
          kind: 'clock_out',
          current: clockedOut,
          transitionedSteps: 2,
          analytics: null,
        },
        4,
      );
    const { result, surfaceOpeners } = setup(store);

    act(() => vi.advanceTimersByTime(4_000));

    expect(store.getState().flow).toMatchObject({
      step: 'result',
      user,
    });
    expect(surfaceOpeners.closeKioskSurfaces).toHaveBeenCalledOnce();
    expect(mocks.clockInReset).toHaveBeenCalledOnce();
    expect(mocks.clockOutReset).toHaveBeenCalledOnce();

    act(() => vi.advanceTimersByTime(250));

    expect(store.getState().flow).toMatchObject({
      step: 'keypad',
      code: '',
      email: '',
      mode: 'code',
    });
    expect(JSON.stringify(result.current.flow)).not.toContain(user.client_id);
  });

  it('returns an inactive confirmation to a cleared keypad after 30 seconds', () => {
    vi.useFakeTimers();
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    const { surfaceOpeners } = setup(store);

    act(() => vi.advanceTimersByTime(30_250));

    expect(store.getState().flow).toMatchObject({
      step: 'keypad',
      code: '',
      email: '',
    });
    expect(surfaceOpeners.closeKioskSurfaces).toHaveBeenCalledOnce();
  });

  it('returns to the keypad when a hidden confirmation outlasts inactivity', () => {
    vi.useFakeTimers();
    const visibilityState = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('visible');
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    const { surfaceOpeners } = setup(store);

    visibilityState.mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    vi.setSystemTime(new Date(Date.now() + 30_000));
    visibilityState.mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => vi.advanceTimersByTime(250));

    expect(store.getState().flow.step).toBe('keypad');
    expect(surfaceOpeners.closeKioskSurfaces).toHaveBeenCalledOnce();
    visibilityState.mockRestore();
  });

  it('builds the clock-in greeting and fresh-current time plate', () => {
    vi.setSystemTime(new Date('2026-07-29T13:00:00.000Z'));
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    store.getState().beginActing(sessionId);
    store
      .getState()
      .showResult(sessionId, { kind: 'clock_in', current: clockedIn }, 4);
    const { result } = setup(store);

    expect(result.current.result).toMatchObject({
      screen: 'plain',
      props: {
        variant: 'in',
        greeting: 'Good afternoon, Marco',
        announcements: [],
        plate: {
          label: 'CLOCKED IN AT',
          time: '08:58',
          right: null,
        },
      },
    });
  });

  it('maps one scheduled shift to surface-specific labels', () => {
    const store = createKioskFlowStore();
    const { result, adapters, scheduledShift } = setup(store);
    scheduledShift.mockReturnValue({
      start: '2026-07-29T05:00:00.000Z',
      end: '2026-07-29T13:30:00.000Z',
    });
    const scheduledCurrent = {
      ...clockedOut,
      scheduled_shift: {
        start: '2026-07-29T05:00:00.000Z',
        end: '2026-07-29T13:30:00.000Z',
      },
    };
    const sessionId = store.getState().flow.sessionId;

    act(() => {
      store.getState().beginConfirm(sessionId, user);
      store.getState().resolveConfirm(sessionId, scheduledCurrent);
    });

    expect(result.current.confirm?.context).toEqual({
      label: "Today's shift",
      value: '07:00 – 15:30',
    });
    expect(adapters.scheduledShift).toHaveBeenLastCalledWith({
      user,
      timeZone: 'Europe/Stockholm',
      currentShift: scheduledCurrent,
    });

    act(() => {
      store.getState().beginActing(sessionId);
      store
        .getState()
        .showResult(
          sessionId,
          {
            kind: 'clock_in',
            current: {
              ...scheduledCurrent,
              clocked_in: true,
              shift_started_at: '2026-07-29T06:58:00.000Z',
              state: 'idle',
            },
          },
          4,
        );
    });

    expect(result.current.result).toMatchObject({
      screen: 'plain',
      props: {
        plate: {
          right: {
            label: 'SCHEDULED',
            value: '07:00 – 15:30',
          },
        },
      },
    });
  });

  it('keeps confirmation open with one generic retry message after an action failure', async () => {
    mocks.clockInAsync.mockRejectedValue(
      new ApiRequestError(503, 'network_error', 'Private backend detail'),
    );
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    const { result, surfaceOpeners } = setup(store);

    await act(async () => {
      result.current.confirm?.onAction();
    });

    await waitFor(() => {
      expect(result.current.confirm?.context).toEqual({
        label: 'Something went wrong.',
        value: 'Please try again',
      });
    });
    expect(result.current.confirm?.pending).toBe(false);
    expect(result.current.flow.step).toBe('confirming');
    expect(surfaceOpeners.closeKioskSurfaces).not.toHaveBeenCalled();
    expect(surfaceOpeners.openResult).not.toHaveBeenCalled();
    expect(JSON.stringify(result.current.confirm)).not.toContain(
      'Private backend detail',
    );
  });

  it('keeps confirmation open when the post-action current refetch fails', async () => {
    mocks.clockInAsync.mockResolvedValue({
      action: 'clock_in',
      user_id: user.client_id,
    });
    mocks.fetchCurrentShift.mockRejectedValue(new Error('offline'));
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    const { result, surfaceOpeners } = setup(store);

    await act(async () => {
      result.current.confirm?.onAction();
    });

    await waitFor(() => {
      expect(result.current.confirm?.context).toEqual({
        label: 'Something went wrong.',
        value: 'Please try again',
      });
    });
    expect(result.current.flow.step).toBe('confirming');
    expect(surfaceOpeners.closeKioskSurfaces).not.toHaveBeenCalled();
    expect(surfaceOpeners.openResult).not.toHaveBeenCalled();
  });

  it('disables matching and shows a quiet offline notice when no roster is available', () => {
    mocks.rosterState.isError = true;
    mocks.rosterState.data = [];
    mocks.matchWorker.mockReturnValue(null);
    const { result, store } = setup();

    act(() => {
      result.current.keypad.onDigit('4');
      result.current.keypad.onDigit('8');
      result.current.keypad.onDigit('2');
      result.current.keypad.onDigit('1');
    });

    expect(result.current.keypad.pending).toBe(true);
    expect(result.current.keypad.error).toBe(false);
    expect(result.current.keypad.statusNotice).toBe(
      'Terminal offline — try again in a moment',
    );
    expect(result.current.keypad.errorMessage).toBe(
      'No worker matches this code or email',
    );
    expect(store.getState().flow).toMatchObject({
      step: 'keypad',
      code: '',
      error: false,
      matching: false,
    });
    expect(mocks.matchWorker).not.toHaveBeenCalled();
  });

  it('continues matching from stale roster data after a roster error', () => {
    mocks.rosterState.isError = true;
    mocks.matchWorker.mockReturnValue(user);
    mocks.fetchCurrentShift.mockResolvedValue(clockedOut);
    const { result } = setup();

    act(() => result.current.keypad.onModeChange('email'));
    act(() => result.current.keypad.onEmailChange('marco@shop.com'));
    act(() => result.current.keypad.onEmailSubmit());

    expect(mocks.matchWorker).toHaveBeenCalledWith([user], 'marco@shop.com');
    expect(result.current.keypad.error).toBe(false);
  });
});

describe('kiosk controller pure helpers', () => {
  it.each([
    ['morning', 'Good morning'],
    ['afternoon', 'Good afternoon'],
    ['evening', 'Good evening'],
  ] as const)('maps %s to complete greeting copy', (dayPart, expected) => {
    expect(goodDayPartGreeting(dayPart)).toBe(expected);
  });

  it('omits unknown role records instead of falling back to ids', () => {
    expect(
      roleLine({
        ...user,
        role: {
          client_id: 'role_private_id',
          uuid: 'private-uuid',
        },
      }),
    ).toBeNull();
  });

  it('recognizes text controls and contenteditable targets as editable', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editable.append(child);

    expect(isEditableEventTarget(input)).toBe(true);
    expect(isEditableEventTarget(textarea)).toBe(true);
    expect(isEditableEventTarget(child)).toBe(true);
    expect(isEditableEventTarget(document.body)).toBe(false);
  });
});
