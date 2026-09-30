import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

// jsdom cannot produce trusted events, so "a human pressed something" is
// simulated by handing the tracker's recorder an `{ isTrusted: true }` event.
// Untrusted events go through the real window listeners.

const API_ORIGIN = 'http://api.test';
const HEADER = 'x-beyo-activity';

type Seen = { method: string; path: string; activity: string | null };
const seen: Seen[] = [];

function log(request: Request): void {
  seen.push({
    method: request.method,
    path: new URL(request.url).pathname,
    activity: request.headers.get(HEADER),
  });
}

const server = setupServer(
  http.all(`${API_ORIGIN}/api/v1/things`, ({ request }) => {
    log(request);
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${API_ORIGIN}/api/v1/auth/refresh`, ({ request }) => {
    log(request);
    return HttpResponse.json({
      ok: true,
      data: { access_token: 'refreshed-token' },
      warnings: [],
    });
  }),
);

const Ok = z.object({ ok: z.literal(true) });

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

async function load() {
  const activity = await import('./activity');
  const { apiClient } = await import('./api-client');
  const tokenModule = await import('./auth-token');
  return { activity, apiClient, tokenModule };
}

function activities(path?: string): Array<string | null> {
  return seen
    .filter((entry) => path === undefined || entry.path === path)
    .map((entry) => entry.activity);
}

function collectUnavailable(): { details: unknown[]; stop: () => void } {
  const details: unknown[] = [];
  const listener = (event: Event) => details.push((event as CustomEvent).detail);
  window.addEventListener('system:unavailable', listener);
  return { details, stop: () => window.removeEventListener('system:unavailable', listener) };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', API_ORIGIN);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  setVisibility('visible');
  seen.length = 0;
});
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  setVisibility('visible');
});
afterAll(() => server.close());

describe('X-Beyo-Activity classification', () => {
  it('a GET with no input is background', async () => {
    const { apiClient } = await load();

    await apiClient.get('/api/v1/things', Ok);

    expect(activities()).toEqual(['background']);
  });

  it('a GET right after a trusted pointerdown is user', async () => {
    const { activity, apiClient } = await load();

    activity.recordInputEvent({ isTrusted: true });
    await apiClient.get('/api/v1/things', Ok);

    expect(activities()).toEqual(['user']);
  });

  it('a scripted (untrusted) input event through the real listeners stays background', async () => {
    const { activity, apiClient } = await load();
    activity.installActivityTracking();

    for (const type of ['pointerdown', 'keydown', 'touchstart']) {
      window.dispatchEvent(new Event(type));
    }
    await apiClient.get('/api/v1/things', Ok);

    expect(activity.lastTrustedInputAt()).toBeNull();
    expect(activities()).toEqual(['background']);
  });

  it('a mutation with no input is background: the method does not make it user', async () => {
    const { apiClient } = await load();

    await apiClient.post('/api/v1/things', Ok, { a: 1 });
    await apiClient.put('/api/v1/things', Ok, { a: 1 });
    await apiClient.patch('/api/v1/things', Ok, { a: 1 });
    await apiClient.delete('/api/v1/things', Ok);

    expect(activities()).toEqual(['background', 'background', 'background', 'background']);
  });

  it('an explicit activity wins over the classifier, both ways', async () => {
    const { activity, apiClient } = await load();

    await apiClient.get('/api/v1/things', Ok, undefined, { activity: 'user' });
    await apiClient.post('/api/v1/things', Ok, {}, { activity: 'user' });

    activity.recordInputEvent({ isTrusted: true });
    await apiClient.get('/api/v1/things', Ok, undefined, { activity: 'background' });
    await apiClient.post('/api/v1/things', Ok, {}, { activity: 'background' });
    await apiClient.put('/api/v1/things', Ok, {}, { activity: 'background' });
    await apiClient.patch('/api/v1/things', Ok, {}, { activity: 'background' });
    await apiClient.delete('/api/v1/things', Ok, undefined, undefined, {
      activity: 'background',
    });

    expect(activities()).toEqual([
      'user',
      'user',
      'background',
      'background',
      'background',
      'background',
      'background',
    ]);
  });

  it('a trusted input counts for 10 s and then expires', async () => {
    const { activity, apiClient } = await load();

    activity.recordInputEvent({ isTrusted: true });
    vi.setSystemTime(Date.now() + 10_000);
    await apiClient.get('/api/v1/things', Ok);
    vi.setSystemTime(Date.now() + 1);
    await apiClient.get('/api/v1/things', Ok);

    expect(activities()).toEqual(['user', 'background']);
    expect(activity.hasRecentTrustedInput()).toBe(false);
    expect(activity.hasRecentTrustedInput(60_000)).toBe(true);
  });

  it('a clock moved back past the input answers background', async () => {
    const { activity } = await load();

    activity.recordInputEvent({ isTrusted: true });
    vi.setSystemTime(Date.now() - 1);

    expect(activity.hasRecentTrustedInput()).toBe(false);
  });

  it('input on a hidden page does not count', async () => {
    const { activity, apiClient } = await load();

    setVisibility('hidden');
    activity.recordInputEvent({ isTrusted: true });
    setVisibility('visible');
    await apiClient.get('/api/v1/things', Ok);

    expect(activity.lastTrustedInputAt()).toBeNull();
    expect(activities()).toEqual(['background']);
  });

  it('installs capture/passive listeners once, however often it is called', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { activity, apiClient } = await load();

    activity.installActivityTracking();
    activity.installActivityTracking();
    await apiClient.get('/api/v1/things', Ok);

    const inputListeners = add.mock.calls.filter(([type]) =>
      ['pointerdown', 'keydown', 'touchstart'].includes(type),
    );
    expect(inputListeners.map(([type, , options]) => [type, options])).toEqual([
      ['pointerdown', { capture: true, passive: true }],
      ['keydown', { capture: true, passive: true }],
      ['touchstart', { capture: true, passive: true }],
    ]);
  });
});

describe('X-Beyo-Activity on the session refresh', () => {
  it('the boot refresh of a visible page is user', async () => {
    const { tokenModule } = await load();

    await expect(tokenModule.initSession('manager')).resolves.toBe('ok');

    expect(activities('/api/v1/auth/refresh')).toEqual(['user']);
  });

  it('the boot refresh of a hidden page is background', async () => {
    const { tokenModule } = await load();
    setVisibility('hidden');

    await expect(tokenModule.initSession('manager')).resolves.toBe('ok');

    expect(activities('/api/v1/auth/refresh')).toEqual(['background']);
  });

  it('a boot retry (explicit background) is background even on a visible page', async () => {
    const { tokenModule } = await load();

    await tokenModule.initSession('manager', { activity: 'background' });

    expect(activities('/api/v1/auth/refresh')).toEqual(['background']);
  });

  it('the socket-reconnect refresh (explicit background) ignores recent input', async () => {
    const { activity, tokenModule } = await load();
    tokenModule.setAuthScope('manager');
    activity.recordInputEvent({ isTrusted: true });

    await tokenModule.refreshAccessToken(undefined, { activity: 'background' });

    expect(activities('/api/v1/auth/refresh')).toEqual(['background']);
  });

  it('a refresh without an explicit activity follows the classifier', async () => {
    const { activity, tokenModule } = await load();
    tokenModule.setAuthScope('manager');

    await tokenModule.refreshAccessToken();
    activity.recordInputEvent({ isTrusted: true });
    await tokenModule.refreshAccessToken();

    expect(activities('/api/v1/auth/refresh')).toEqual(['background', 'user']);
  });
});

describe('the 401 refresh and replay inherit the request classification', () => {
  function expireOnce(onFirst?: () => void): void {
    let calls = 0;
    server.use(
      http.get(`${API_ORIGIN}/api/v1/protected`, ({ request }) => {
        log(request);
        calls += 1;
        if (calls === 1) {
          onFirst?.();
          return HttpResponse.json({ error: 'Expired.', ok: false }, { status: 401 });
        }
        return HttpResponse.json({ ok: true });
      }),
    );
  }

  it('an explicit user request refreshes and replays as user with no input', async () => {
    expireOnce();
    const { apiClient, tokenModule } = await load();
    tokenModule.setAccessToken('stale-token', 'manager');

    await apiClient.get('/api/v1/protected', Ok, undefined, { activity: 'user' });

    expect(seen.map((entry) => `${entry.path} ${entry.activity}`)).toEqual([
      '/api/v1/protected user',
      '/api/v1/auth/refresh user',
      '/api/v1/protected user',
    ]);
  });

  it('the classification is resolved once: input expiring mid-flight does not change the replay', async () => {
    // The input is 9.9 s old when the request starts and expired by the time
    // the 401 arrives — the refresh and replay still go out as user.
    expireOnce(() => vi.setSystemTime(Date.now() + 5_000));
    const { activity, apiClient, tokenModule } = await load();
    tokenModule.setAccessToken('stale-token', 'manager');
    activity.recordInputEvent({ isTrusted: true });
    vi.setSystemTime(Date.now() + 9_900);

    await apiClient.get('/api/v1/protected', Ok);

    expect(activity.hasRecentTrustedInput()).toBe(false);
    expect(seen.map((entry) => `${entry.path} ${entry.activity}`)).toEqual([
      '/api/v1/protected user',
      '/api/v1/auth/refresh user',
      '/api/v1/protected user',
    ]);
  });

  it('a background request refreshes and replays as background despite fresh input', async () => {
    const { activity, apiClient, tokenModule } = await load();
    // A tap lands while the request is in flight.
    expireOnce(() => activity.recordInputEvent({ isTrusted: true }));
    tokenModule.setAccessToken('stale-token', 'manager');

    await apiClient.get('/api/v1/protected', Ok);

    expect(seen.map((entry) => `${entry.path} ${entry.activity}`)).toEqual([
      '/api/v1/protected background',
      '/api/v1/auth/refresh background',
      '/api/v1/protected background',
    ]);
  });
});

describe('system:unavailable reports the resolved classification', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/outage`, ({ request }) => {
        log(request);
        return new HttpResponse(null, { status: 503 });
      }),
    );
  });

  it.each([
    ['no input', undefined, false, true],
    ['recent trusted input', undefined, true, false],
    ['explicit user, no input', 'user' as const, false, false],
    ['explicit background, recent input', 'background' as const, true, true],
  ])('%s → background: %s', async (_label, explicit, withInput, expectedBackground) => {
    const { activity, apiClient } = await load();
    if (withInput) activity.recordInputEvent({ isTrusted: true });
    const unavailable = collectUnavailable();

    try {
      await expect(
        apiClient.get('/api/v1/outage', Ok, undefined, explicit ? { activity: explicit } : undefined),
      ).rejects.toMatchObject({ code: 'unavailable' });
    } finally {
      unavailable.stop();
    }

    expect(unavailable.details).toEqual([
      { status: 503, path: '/api/v1/outage', background: expectedBackground },
    ]);
    expect(activities('/api/v1/outage')).toEqual([expectedBackground ? 'background' : 'user']);
  });
});
