import { describe, expect, it } from 'vitest';
import type {
  CurrentShift,
  FloorRosterUser,
} from '@beyo/worker-shifts';
import { createKioskFlowStore } from './kiosk-flow.store';

const user: FloorRosterUser = {
  client_id: 'usr_store',
  username: 'Store Worker',
  profile_picture: null,
  role: { name: 'Assembly' },
  clock_in_code: '4821',
  email: 'store@example.com',
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

describe('kiosk flow store', () => {
  it('moves keypad → confirming → acting → result → cleared keypad', () => {
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;

    store.getState().setCode(sessionId, '4821');
    expect(store.getState().beginMatch(sessionId)).toBe(true);
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    expect(store.getState().beginActing(sessionId)).toBe(true);
    store.getState().showResult(
      sessionId,
      { kind: 'clock_in', current: { ...clockedOut, clocked_in: true } },
      12,
    );

    expect(store.getState().flow.step).toBe('result');

    const nextSessionId = store.getState().reset();
    const reset = store.getState().flow;
    expect(reset).toEqual({
      step: 'keypad',
      sessionId: nextSessionId,
      code: '',
      email: '',
      mode: 'code',
      error: false,
      matching: false,
    });
    expect(nextSessionId).not.toBe(sessionId);
  });

  it('keeps a failed action on confirmation with a generic retry state', () => {
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().beginConfirm(sessionId, user);
    store.getState().resolveConfirm(sessionId, clockedOut);
    store.getState().beginActing(sessionId);
    store.getState().failAction(sessionId);

    expect(store.getState().flow).toMatchObject({
      step: 'confirming',
      sessionId,
      user,
      current: clockedOut,
      actionFailed: true,
    });
  });

  it('drops every transition carrying a stale session id', () => {
    const store = createKioskFlowStore();
    const staleSessionId = store.getState().flow.sessionId;
    const activeSessionId = store.getState().reset();

    store.getState().beginConfirm(staleSessionId, user);
    store.getState().resolveConfirm(staleSessionId, clockedOut);
    store
      .getState()
      .showResult(staleSessionId, { kind: 'clock_in', current: clockedOut }, 12);

    expect(store.getState().flow).toMatchObject({
      step: 'keypad',
      sessionId: activeSessionId,
    });
  });

  it('clears the typed identifier while keeping one generic no-match state', () => {
    const store = createKioskFlowStore();
    const sessionId = store.getState().flow.sessionId;
    store.getState().setMode(sessionId, 'email');
    store.getState().setEmail(sessionId, 'worker@example.com');
    store.getState().beginMatch(sessionId);
    store.getState().rejectMatch(sessionId);

    expect(store.getState().flow).toMatchObject({
      step: 'keypad',
      mode: 'email',
      email: '',
      code: '',
      error: true,
    });
  });
});
