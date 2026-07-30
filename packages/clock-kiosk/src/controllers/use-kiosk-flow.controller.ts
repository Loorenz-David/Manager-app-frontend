import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import {
  dayPartGreeting,
  fetchCurrentShift,
  firstName,
  formatTimeInTimeZone,
  matchWorker,
  useClockIn,
  useClockOut,
  useFloorRosterQuery,
  type CurrentShift,
  type DayPartGreeting,
  type FloorRosterUser,
} from '@beyo/worker-shifts';
import { useSurfaceStore } from '@beyo/ui';
import {
  CLOCK_KIOSK_CONFIRM_SURFACE_ID,
  CLOCK_KIOSK_RESULT_SURFACE_ID,
  type ClockKioskSurfaceOpeners,
} from '../surface-ids';
import { toClockOutSummaryViewModel } from '../lib/analytics-view-model';
import {
  gateAnnouncements,
  gateSummaryExtras,
} from '../lib/kiosk-adapters';
import type { KioskAdapters } from '../types';
import type {
  KioskFlowStoreApi,
  KioskResult,
} from '../store/kiosk-flow.store';

const CONFIRM_AUTO_RETURN_MS = 30_000;
const RISE_SURFACE_EXIT_MS = 250;
const GENERIC_NO_MATCH_MESSAGE = 'No worker matches this code or email';
const TERMINAL_OFFLINE_MESSAGE = 'Terminal offline — try again in a moment';
const GENERIC_ACTION_RETRY_CONTEXT = {
  label: 'Something went wrong.',
  value: 'Please try again',
} as const;

type ControllerOptions = {
  store: KioskFlowStoreApi;
  surfaceOpeners: ClockKioskSurfaceOpeners;
  adapters: KioskAdapters;
  autoReturnSeconds: number;
  timeZone: string;
};

function isHttpConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Record<string, unknown>;
  return (
    candidate.status === 409 ||
    candidate.statusCode === 409 ||
    candidate.status_code === 409
  );
}

export function goodDayPartGreeting(dayPart: DayPartGreeting): string {
  return `Good ${dayPart}`;
}

export function roleLine(user: FloorRosterUser): string | null {
  const preferredKeys = ['name', 'role_name', 'workspace_role_name'];
  for (const key of preferredKeys) {
    const value = user.role[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function isEditableEventTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable]') !== null
  );
}

function activeTaskNotice(count: number): string | null {
  if (count <= 0) return null;
  return `${count} active ${count === 1 ? 'task was' : 'tasks were'} stopped`;
}

function scheduledShiftContext(
  scheduledShift: ReturnType<KioskAdapters['scheduledShift']>,
  timeZone: string,
  label: string,
): { label: string; value: string } | null {
  if (!scheduledShift) return null;
  try {
    return {
      label,
      value: `${formatTimeInTimeZone(
        scheduledShift.start,
        timeZone,
      )} – ${formatTimeInTimeZone(scheduledShift.end, timeZone)}`,
    };
  } catch {
    return null;
  }
}

export function useKioskFlowController({
  store,
  surfaceOpeners,
  adapters,
  autoReturnSeconds,
  timeZone,
}: ControllerOptions) {
  const flow = useStore(store, (state) => state.flow);
  const rosterQuery = useFloorRosterQuery();
  const clockInAction = useClockIn();
  const clockOutAction = useClockOut();
  const surfaceStack = useSurfaceStore((state) => state.stack);
  const exitingSessionIdRef = useRef<string | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const hasRoster = (rosterQuery.data?.length ?? 0) > 0;
  const rosterUnavailable = rosterQuery.isPending || (rosterQuery.isError && !hasRoster);
  const hasForeignSurface = surfaceStack.some(
    ({ id }) =>
      id !== CLOCK_KIOSK_CONFIRM_SURFACE_ID &&
      id !== CLOCK_KIOSK_RESULT_SURFACE_ID,
  );

  const isSessionActive = useCallback(
    (sessionId: string) =>
      store.getState().flow.sessionId === sessionId &&
      exitingSessionIdRef.current !== sessionId,
    [store],
  );

  const returnToKeypad = useCallback(() => {
    const sessionId = store.getState().flow.sessionId;
    exitingSessionIdRef.current = sessionId;
    clockInAction.reset();
    clockOutAction.reset();
    surfaceOpeners.closeKioskSurfaces();
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = window.setTimeout(() => {
      if (store.getState().flow.sessionId === sessionId) {
        store.getState().reset();
      }
      if (exitingSessionIdRef.current === sessionId) {
        exitingSessionIdRef.current = null;
      }
      resetTimeoutRef.current = null;
    }, RISE_SURFACE_EXIT_MS);
  }, [clockInAction, clockOutAction, store, surfaceOpeners]);

  useEffect(
    () => () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    },
    [],
  );

  const refreshConfirm = useCallback(
    async (sessionId: string, user: FloorRosterUser) => {
      try {
        const current = await fetchCurrentShift(user.client_id);
        if (!isSessionActive(sessionId)) return;
        store.getState().resolveConfirm(sessionId, current);
        surfaceOpeners.openIdentityConfirm();
      } catch {
        if (!isSessionActive(sessionId)) return;
        store.getState().failAction(sessionId);
      }
    },
    [isSessionActive, store, surfaceOpeners],
  );

  const submitMatch = useCallback(
    (value: string) => {
      const snapshot = store.getState().flow;
      if (
        snapshot.step !== 'keypad' ||
        snapshot.matching ||
        rosterUnavailable
      ) {
        return;
      }
      const sessionId = snapshot.sessionId;
      if (!store.getState().beginMatch(sessionId)) return;

      const user = matchWorker(rosterQuery.data ?? [], value);
      if (!user) {
        store.getState().rejectMatch(sessionId);
        return;
      }

      store.getState().beginConfirm(sessionId, user);
      surfaceOpeners.openIdentityConfirm();
      void refreshConfirm(sessionId, user);
    },
    [
      refreshConfirm,
      rosterQuery.data,
      rosterUnavailable,
      store,
      surfaceOpeners,
    ],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      const snapshot = store.getState().flow;
      if (
        snapshot.step !== 'keypad' ||
        snapshot.mode !== 'code' ||
        snapshot.matching ||
        rosterUnavailable ||
        !/^\d$/.test(digit)
      ) {
        return;
      }
      const code = `${snapshot.code}${digit}`.slice(0, 4);
      store.getState().setCode(snapshot.sessionId, code);
      if (code.length === 4) submitMatch(code);
    },
    [rosterUnavailable, store, submitMatch],
  );

  const handleDelete = useCallback(() => {
    const snapshot = store.getState().flow;
    if (
      snapshot.step !== 'keypad' ||
      snapshot.mode !== 'code' ||
      snapshot.matching
    ) {
      return;
    }
    store
      .getState()
      .setCode(snapshot.sessionId, snapshot.code.slice(0, -1));
  }, [store]);

  const handleCodeSubmit = useCallback(() => {
    const snapshot = store.getState().flow;
    if (
      snapshot.step === 'keypad' &&
      snapshot.mode === 'code' &&
      snapshot.code.length === 4
    ) {
      submitMatch(snapshot.code);
    }
  }, [store, submitMatch]);

  const handleEmailSubmit = useCallback(() => {
    const snapshot = store.getState().flow;
    if (
      snapshot.step === 'keypad' &&
      snapshot.mode === 'email' &&
      snapshot.email.trim()
    ) {
      submitMatch(snapshot.email);
    }
  }, [store, submitMatch]);

  const handleModeChange = useCallback(
    (mode: 'code' | 'email') => {
      const snapshot = store.getState().flow;
      if (snapshot.step === 'keypad') {
        store.getState().setMode(snapshot.sessionId, mode);
      }
    },
    [store],
  );

  const handleEmailChange = useCallback(
    (email: string) => {
      const snapshot = store.getState().flow;
      if (snapshot.step === 'keypad') {
        store.getState().setEmail(snapshot.sessionId, email);
      }
    },
    [store],
  );

  const fetchAfterAction = useCallback(
    async (sessionId: string, user: FloorRosterUser) => {
      try {
        const current = await fetchCurrentShift(user.client_id);
        if (!isSessionActive(sessionId)) return null;
        return current;
      } catch {
        if (isSessionActive(sessionId)) {
          store.getState().failAction(sessionId);
        }
        return null;
      }
    },
    [isSessionActive, store],
  );

  const handleAction = useCallback(async () => {
    const snapshot = store.getState().flow;
    if (
      snapshot.step !== 'confirming' ||
      !snapshot.current ||
      !store.getState().beginActing(snapshot.sessionId)
    ) {
      return;
    }

    const { sessionId, user, current } = snapshot;
    let result: KioskResult | null = null;

    try {
      if (current.clocked_in) {
        const actionResult = await clockOutAction.clockOutAsync({
          user_id: user.client_id,
        });
        if (!isSessionActive(sessionId)) return;
        const fresh = await fetchAfterAction(sessionId, user);
        if (!fresh || !isSessionActive(sessionId)) return;
        if (fresh.clocked_in) {
          store.getState().resolveConfirm(sessionId, fresh);
          surfaceOpeners.openIdentityConfirm();
          return;
        }
        result = {
          kind: 'clock_out',
          current: fresh,
          transitionedSteps: actionResult.transitioned_steps,
          analytics: actionResult.analytics,
        };
      } else {
        await clockInAction.clockInAsync({ user_id: user.client_id });
        if (!isSessionActive(sessionId)) return;
        const fresh = await fetchAfterAction(sessionId, user);
        if (!fresh || !isSessionActive(sessionId)) return;
        if (!fresh.clocked_in) {
          store.getState().resolveConfirm(sessionId, fresh);
          surfaceOpeners.openIdentityConfirm();
          return;
        }
        result = { kind: 'clock_in', current: fresh };
      }
    } catch (error) {
      if (!isSessionActive(sessionId)) return;
      if (isHttpConflict(error)) {
        await refreshConfirm(sessionId, user);
        return;
      }
      store.getState().failAction(sessionId);
      return;
    }

    if (!result || !isSessionActive(sessionId)) return;
    store
      .getState()
      .showResult(sessionId, result, autoReturnSeconds);
    surfaceOpeners.openResult();
  }, [
    autoReturnSeconds,
    clockInAction,
    clockOutAction,
    fetchAfterAction,
    isSessionActive,
    refreshConfirm,
    returnToKeypad,
    store,
    surfaceOpeners,
  ]);

  useEffect(() => {
    if (flow.step !== 'confirming') return;
    const sessionId = flow.sessionId;
    const timeoutId = window.setTimeout(() => {
      if (isSessionActive(sessionId)) returnToKeypad();
    }, CONFIRM_AUTO_RETURN_MS);
    return () => window.clearTimeout(timeoutId);
  }, [flow.sessionId, flow.step, isSessionActive, returnToKeypad]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (
        hiddenAt !== null &&
        Date.now() - hiddenAt >= CONFIRM_AUTO_RETURN_MS &&
        store.getState().flow.step === 'confirming'
      ) {
        returnToKeypad();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [returnToKeypad, store]);

  useEffect(() => {
    if (flow.step !== 'result') return;
    const sessionId = flow.sessionId;
    const intervalId = window.setInterval(() => {
      const seconds = store.getState().tickResult(sessionId);
      if (seconds === 0) returnToKeypad();
    }, 1_000);
    return () => window.clearInterval(intervalId);
  }, [flow.sessionId, flow.step, returnToKeypad, store]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target) || hasForeignSurface) return;
      const snapshot = store.getState().flow;
      if (event.key === 'Escape' && snapshot.step !== 'keypad') {
        event.preventDefault();
        returnToKeypad();
        return;
      }
      if (
        snapshot.step !== 'keypad' ||
        snapshot.mode !== 'code' ||
        surfaceStack.length > 0
      ) {
        return;
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        handleDigit(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        handleDelete();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleCodeSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleCodeSubmit,
    handleDelete,
    handleDigit,
    hasForeignSurface,
    returnToKeypad,
    store,
    surfaceStack.length,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      if (store.getState().flow.step !== 'keypad') returnToKeypad();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [returnToKeypad, store]);

  const keypad = {
    code: flow.step === 'keypad' ? flow.code : '',
    emailValue: flow.step === 'keypad' ? flow.email : '',
    error: flow.step === 'keypad' ? flow.error : false,
    errorMessage: GENERIC_NO_MATCH_MESSAGE,
    statusNotice:
      flow.step === 'keypad' && rosterQuery.isError && !hasRoster
        ? TERMINAL_OFFLINE_MESSAGE
        : null,
    mode: flow.step === 'keypad' ? flow.mode : ('code' as const),
    pending:
      flow.step === 'keypad'
        ? flow.matching || rosterUnavailable
        : true,
    onDigit: handleDigit,
    onDelete: handleDelete,
    onSubmit: handleCodeSubmit,
    onModeChange: handleModeChange,
    onEmailChange: handleEmailChange,
    onEmailSubmit: handleEmailSubmit,
    // Pull-to-refresh on the keypad refetches the roster (the screen's only
    // query); PullToRefresh awaits the promise to run its spinner.
    onRefresh: async () => {
      await rosterQuery.refetch();
    },
  };

  const confirm = useMemo(() => {
    if (flow.step !== 'confirming' && flow.step !== 'acting') return null;
    const current: CurrentShift | null = flow.current;
    const actionFailed =
      flow.step === 'confirming' && flow.actionFailed;
    const scheduled = current?.clocked_in
      ? null
      : scheduledShiftContext(
          adapters.scheduledShift({
            user: flow.user,
            timeZone,
            currentShift: current,
          }),
          timeZone,
          "Today's shift",
        );
    return {
      user: {
        name: flow.user.username,
        roleLine: roleLine(flow.user),
        avatarUrl: flow.user.profile_picture,
      },
      context: actionFailed
        ? GENERIC_ACTION_RETRY_CONTEXT
        : current?.clocked_in && current.shift_started_at
            ? {
                label: 'Clocked in at',
                value: formatTimeInTimeZone(
                  current.shift_started_at,
                  timeZone,
                ),
              }
            : scheduled,
      action: current?.clocked_in ? ('clock_out' as const) : ('clock_in' as const),
      pending: flow.step === 'acting' || current === null,
      onAction: () => {
        void handleAction();
      },
      onBack: returnToKeypad,
    };
  }, [adapters, flow, handleAction, returnToKeypad, timeZone]);

  const result = useMemo(() => {
    if (flow.step !== 'result') return null;
    const name = firstName(flow.user.username);
    if (flow.result.kind === 'clock_in') {
      const startedAt = flow.result.current.shift_started_at;
      const announcements = gateAnnouncements(
        adapters.announcements({ user: flow.user, timeZone }),
      );
      return {
        screen: 'plain' as const,
        props: {
          variant: 'in' as const,
          greeting: `${goodDayPartGreeting(
            dayPartGreeting(timeZone, new Date()),
          )}, ${name}`,
          subtitle: "You're clocked in for today's shift",
          plate: startedAt
            ? {
                label: 'CLOCKED IN AT',
                time: formatTimeInTimeZone(startedAt, timeZone),
                right: scheduledShiftContext(
                  adapters.scheduledShift({
                    user: flow.user,
                    timeZone,
                    currentShift: flow.result.current,
                  }),
                  timeZone,
                  'SCHEDULED',
                ),
              }
            : null,
          notice: null,
          announcements,
          countdownSeconds: flow.countdownSeconds,
          onDone: returnToKeypad,
        },
      };
    }

    const summary = toClockOutSummaryViewModel(flow.result.analytics, {
      timeZone,
      now: new Date(),
    });
    const notice = activeTaskNotice(flow.result.transitionedSteps);
    if (summary && flow.result.analytics) {
      const extras = gateSummaryExtras(adapters.summaryExtras, {
        analytics: flow.result.analytics,
        user: flow.user,
        timeZone,
      });
      const userRole = roleLine(flow.user);
      return {
        screen: 'summary' as const,
        props: {
          title: `Shift complete, ${name}`,
          subtitle: userRole
            ? [userRole, summary.dateLabel].filter(Boolean).join(' · ')
            : summary.dateLabel ?? '',
          name: flow.user.username,
          avatarUrl: flow.user.profile_picture,
          worked: summary.worked,
          items: extras.items,
          week: extras.week,
          rate: extras.rate,
          insights: summary.insights,
          notice,
          countdownSeconds: flow.countdownSeconds,
          onDone: returnToKeypad,
        },
      };
    }

    // Handoff §5.1 hard rule: null or marker-incomplete analytics preserves
    // the exact Phase 4 plain clock-out success path.
    return {
      screen: 'plain' as const,
      props: {
        variant: 'out' as const,
        greeting: `Shift complete, ${name}`,
        subtitle: 'Your shift has been clocked out',
        plate: null,
        notice,
        announcements: [],
        countdownSeconds: flow.countdownSeconds,
        onDone: returnToKeypad,
      },
    };
  }, [adapters, flow, returnToKeypad, timeZone]);

  return {
    flow,
    keypad,
    confirm,
    result,
    returnToKeypad,
  };
}

export type KioskFlowController = ReturnType<
  typeof useKioskFlowController
>;
