import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

const API_ORIGIN = 'http://api.test';
const requestLog: string[] = [];

const server = setupServer(
  http.get(`${API_ORIGIN}/api/v1/protected`, ({ request }) => {
    requestLog.push(`${request.method} ${new URL(request.url).pathname}`);
    return HttpResponse.json({ error: 'Revoked.', ok: false }, { status: 401 });
  }),
  http.post(`${API_ORIGIN}/api/v1/auth/refresh`, ({ request }) => {
    const url = new URL(request.url);
    requestLog.push(`${request.method} ${url.pathname}${url.search}`);
    return HttpResponse.json({
      ok: true,
      data: { access_token: 'refreshed-token' },
      warnings: [],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', API_ORIGIN);
  window.localStorage.clear();
  requestLog.length = 0;
});

afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => server.close());

describe('floor access-token persistence', () => {
  it('persists and restores a floor token without a refresh request', async () => {
    const tokenModule = await import('./auth-token');
    tokenModule.setAuthScope('floor');
    tokenModule.setAccessToken('floor-token');

    expect(
      window.localStorage.getItem(tokenModule.FLOOR_ACCESS_TOKEN_STORAGE_KEY),
    ).toBe('floor-token');

    vi.resetModules();
    const restoredModule = await import('./auth-token');

    await expect(restoredModule.initSession('floor')).resolves.toBe('ok');
    expect(restoredModule.getAccessToken()).toBe('floor-token');
    expect(requestLog).toEqual([]);
  });

  it('never reads, writes, or clears storage for non-floor scopes', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const tokenModule = await import('./auth-token');

    for (const scope of ['admin', 'manager', 'worker', 'seller']) {
      await expect(tokenModule.initSession(scope)).resolves.toBe('ok');
      tokenModule.setAccessToken(`${scope}-token`, scope);
      tokenModule.setAccessToken(null);
    }

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(requestLog.filter((entry) => entry.includes('/auth/refresh'))).toHaveLength(4);
  });
});

describe('floor 401 revocation', () => {
  it('clears storage and memory, dispatches session-expired, and issues zero refresh calls', async () => {
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    const sessionExpired = vi.fn();

    window.addEventListener('auth:session-expired', sessionExpired);
    tokenModule.setAuthScope('floor');
    tokenModule.setAccessToken('floor-token');

    try {
      await expect(
        apiClient.get('/api/v1/protected', z.object({})),
      ).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    } finally {
      window.removeEventListener('auth:session-expired', sessionExpired);
    }

    expect(tokenModule.getAccessToken()).toBeNull();
    expect(
      window.localStorage.getItem(tokenModule.FLOOR_ACCESS_TOKEN_STORAGE_KEY),
    ).toBeNull();
    expect(sessionExpired).toHaveBeenCalledTimes(1);
    expect(requestLog).toEqual(['GET /api/v1/protected']);
    expect(requestLog.filter((entry) => entry.includes('/auth/refresh'))).toHaveLength(0);
  });
});

describe('detail-only API errors', () => {
  it('preserves a 403 {detail} response without treating it as an invalid envelope', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/forbidden`, () =>
        HttpResponse.json({ detail: 'You do not have access.' }, { status: 403 }),
      ),
    );
    const { apiClient } = await import('./api-client');

    await expect(apiClient.get('/api/v1/forbidden', z.object({}))).rejects.toMatchObject({
      status: 403,
      code: 'forbidden',
      message: 'You do not have access.',
      details: 'You do not have access.',
    });
  });

  it('preserves an array detail at 422 instead of crashing the error parser', async () => {
    const detail = [{ loc: ['body', 'quantity'], msg: 'required' }];
    server.use(
      http.post(`${API_ORIGIN}/api/v1/invalid`, () =>
        HttpResponse.json({ detail }, { status: 422 }),
      ),
    );
    const { apiClient } = await import('./api-client');

    await expect(apiClient.post('/api/v1/invalid', z.object({}), {})).rejects.toMatchObject({
      status: 422,
      code: 'unprocessable',
      details: detail,
    });
  });
});

function collectWindowEvents(type: string): { events: CustomEvent[]; stop: () => void } {
  const events: CustomEvent[] = [];
  const listener = (event: Event) => events.push(event as CustomEvent);
  window.addEventListener(type, listener);
  return { events, stop: () => window.removeEventListener(type, listener) };
}

const refreshFailures: Array<[string, () => Response]> = [
  ['503 auth_unavailable', () =>
    HttpResponse.json(
      { error: 'Auth unavailable.', ok: false, code: 'auth_unavailable' },
      { status: 503, headers: { 'Retry-After': '5' } },
    )],
  ['502', () => new HttpResponse(null, { status: 502 })],
  ['504', () => new HttpResponse('Gateway Timeout', { status: 504 })],
  ['500', () => HttpResponse.json({ error: 'Boom.', ok: false }, { status: 500 })],
  ['a network error', () => HttpResponse.error()],
  ['a pre-503 blocklist outage (401 refresh_blocklist_unavailable)', () =>
    HttpResponse.json(
      {
        error: 'Refresh token verification unavailable.',
        ok: false,
        code: 'auth_refresh_rejected',
        reason: 'refresh_blocklist_unavailable',
      },
      { status: 401 },
    )],
  ['a 401 without an auth error code', () =>
    HttpResponse.json({ detail: 'Unauthorized.' }, { status: 401 })],
  ['a 403 without an auth error code', () =>
    HttpResponse.json({ detail: 'Forbidden.' }, { status: 403 })],
  ['a 200 without an access token', () =>
    HttpResponse.json({ ok: true, data: {}, warnings: [] })],
];

describe('tri-state refresh: unavailable keeps the session', () => {
  it.each(refreshFailures)(
    'refresh answering %s returns unavailable and keeps the token',
    async (_label, respond) => {
      server.use(http.post(`${API_ORIGIN}/api/v1/auth/refresh`, respond));
      const tokenModule = await import('./auth-token');
      tokenModule.setAccessToken('manager-token', 'manager');

      await expect(tokenModule.refreshAccessToken()).resolves.toBe('unavailable');
      expect(tokenModule.getAccessToken()).toBe('manager-token');
    },
  );

  it.each(refreshFailures)(
    'a 401 whose refresh answers %s keeps the token and reports unavailable, not session-expired',
    async (_label, respond) => {
      server.use(http.post(`${API_ORIGIN}/api/v1/auth/refresh`, respond));
      const tokenModule = await import('./auth-token');
      const { apiClient } = await import('./api-client');
      tokenModule.setAccessToken('manager-token', 'manager');
      const expired = collectWindowEvents('auth:session-expired');
      const unavailable = collectWindowEvents('system:unavailable');

      try {
        await expect(
          apiClient.get('/api/v1/protected', z.object({})),
        ).rejects.toMatchObject({ status: 0, code: 'unavailable' });
      } finally {
        expired.stop();
        unavailable.stop();
      }

      expect(tokenModule.getAccessToken()).toBe('manager-token');
      expect(expired.events).toHaveLength(0);
      expect(unavailable.events).toHaveLength(1);
      expect(unavailable.events[0].detail).toEqual({
        status: 0,
        path: '/api/v1/protected',
        // No human input in this test: the request is classified background.
        background: true,
      });
    },
  );

  it('boot restore (initSession) answers unavailable when refresh cannot be checked', async () => {
    server.use(
      http.post(`${API_ORIGIN}/api/v1/auth/refresh`, () => HttpResponse.error()),
    );
    const tokenModule = await import('./auth-token');

    await expect(tokenModule.initSession('manager')).resolves.toBe('unavailable');
  });
});

describe('tri-state refresh: invalid signs out', () => {
  it('a 401 auth_refresh_rejected returns invalid and clears the token', async () => {
    server.use(
      http.post(`${API_ORIGIN}/api/v1/auth/refresh`, () =>
        HttpResponse.json(
          {
            error: 'Refresh token has been revoked.',
            ok: false,
            code: 'auth_refresh_rejected',
            reason: 'refresh_token_revoked',
          },
          { status: 401 },
        ),
      ),
    );
    const tokenModule = await import('./auth-token');
    tokenModule.setAccessToken('manager-token', 'manager');

    await expect(tokenModule.refreshAccessToken()).resolves.toBe('invalid');
    expect(tokenModule.getAccessToken()).toBeNull();
  });

  it('a 401 whose refresh is rejected dispatches session-expired exactly once', async () => {
    server.use(
      http.post(`${API_ORIGIN}/api/v1/auth/refresh`, () =>
        HttpResponse.json(
          { error: 'Invalid refresh token.', ok: false, code: 'auth_refresh_rejected' },
          { status: 401 },
        ),
      ),
    );
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    tokenModule.setAccessToken('manager-token', 'manager');
    const expired = collectWindowEvents('auth:session-expired');
    const unavailable = collectWindowEvents('system:unavailable');

    try {
      await expect(
        apiClient.get('/api/v1/protected', z.object({})),
      ).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    } finally {
      expired.stop();
      unavailable.stop();
    }

    expect(tokenModule.getAccessToken()).toBeNull();
    expect(expired.events).toHaveLength(1);
    expect(unavailable.events).toHaveLength(0);
  });

  it('a successful refresh retries the request once and returns ok', async () => {
    let protectedCalls = 0;
    server.use(
      http.get(`${API_ORIGIN}/api/v1/protected`, ({ request }) => {
        protectedCalls += 1;
        return request.headers.get('Authorization') === 'Bearer refreshed-token'
          ? HttpResponse.json({ value: 1 })
          : HttpResponse.json({ error: 'Expired.', ok: false }, { status: 401 });
      }),
    );
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    tokenModule.setAccessToken('stale-token', 'manager');

    await expect(
      apiClient.get('/api/v1/protected', z.object({ value: z.number() })),
    ).resolves.toEqual({ value: 1 });
    expect(protectedCalls).toBe(2);
    expect(tokenModule.getAccessToken()).toBe('refreshed-token');
  });

  it('concurrent 401s share one refresh (single flight)', async () => {
    const tokenModule = await import('./auth-token');
    tokenModule.setAccessToken('manager-token', 'manager');

    const outcomes = await Promise.all([
      tokenModule.refreshAccessToken(),
      tokenModule.refreshAccessToken(),
      tokenModule.refreshAccessToken(),
    ]);

    expect(outcomes).toEqual(['ok', 'ok', 'ok']);
    expect(requestLog.filter((entry) => entry.includes('/auth/refresh'))).toHaveLength(1);
  });
});

describe('floor kiosk token survives outages', () => {
  const outages: Array<[string, () => Response]> = [
    ['503 auth_unavailable', () =>
      HttpResponse.json(
        { error: 'Auth unavailable.', ok: false, code: 'auth_unavailable' },
        { status: 503 },
      )],
    ['502', () => new HttpResponse(null, { status: 502 })],
    ['504', () => new HttpResponse(null, { status: 504 })],
    ['500', () => HttpResponse.json({ error: 'Boom.', ok: false }, { status: 500 })],
    ['a network error', () => HttpResponse.error()],
  ];

  it.each(outages)('keeps the stored floor token on %s', async (_label, respond) => {
    server.use(http.get(`${API_ORIGIN}/api/v1/floor-thing`, respond));
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    tokenModule.setAuthScope('floor');
    tokenModule.setAccessToken('floor-token');
    const expired = collectWindowEvents('auth:session-expired');

    try {
      await expect(apiClient.get('/api/v1/floor-thing', z.object({}))).rejects.toBeInstanceOf(
        (await import('./api-client')).ApiRequestError,
      );
    } finally {
      expired.stop();
    }

    expect(tokenModule.getAccessToken()).toBe('floor-token');
    expect(
      window.localStorage.getItem(tokenModule.FLOOR_ACCESS_TOKEN_STORAGE_KEY),
    ).toBe('floor-token');
    expect(expired.events).toHaveLength(0);
    expect(requestLog.filter((entry) => entry.includes('/auth/refresh'))).toHaveLength(0);
  });

  it('boot restore without a stored floor token answers invalid', async () => {
    const tokenModule = await import('./auth-token');

    await expect(tokenModule.initSession('floor')).resolves.toBe('invalid');
    expect(requestLog).toEqual([]);
  });
});
