import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

const API_ORIGIN = 'http://api.test';
const searches: string[] = [];
const refreshCalls: string[] = [];

const server = setupServer(
  http.get(`${API_ORIGIN}/api/v1/things`, ({ request }) => {
    searches.push(new URL(request.url).search);
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${API_ORIGIN}/api/v1/auth/refresh`, ({ request }) => {
    refreshCalls.push(new URL(request.url).search);
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
  searches.length = 0;
  refreshCalls.length = 0;
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe('apiClient query parameters', () => {
  it('repeats a key once per array element and drops undefined and empty lists', async () => {
    const { apiClient } = await import('./api-client');

    await apiClient.get('/api/v1/things', z.object({ ok: z.literal(true) }), {
      a: 'x',
      b: ['1', '2'],
      c: [],
      d: undefined,
      e: 0,
    });

    expect(searches).toEqual(['?a=x&b=1&b=2&e=0']);
  });
});

function collectWindowEvents(type: string): { events: CustomEvent[]; stop: () => void } {
  const events: CustomEvent[] = [];
  const listener = (event: Event) => events.push(event as CustomEvent);
  window.addEventListener(type, listener);
  return { events, stop: () => window.removeEventListener(type, listener) };
}

describe('unavailable is not unauthenticated', () => {
  it.each([
    [
      '503 auth_unavailable',
      503,
      () =>
        HttpResponse.json(
          { error: 'Authentication is temporarily unavailable.', ok: false, code: 'auth_unavailable' },
          { status: 503, headers: { 'Retry-After': '5' } },
        ),
    ],
    ['502 (no body)', 502, () => new HttpResponse(null, { status: 502 })],
    ['504 (html body)', 504, () => new HttpResponse('<html>Gateway Timeout</html>', { status: 504 })],
  ])('%s becomes code "unavailable" and dispatches system:unavailable', async (_label, status, respond) => {
    server.use(http.get(`${API_ORIGIN}/api/v1/outage`, respond));
    const { apiClient } = await import('./api-client');
    const unavailable = collectWindowEvents('system:unavailable');
    const expired = collectWindowEvents('auth:session-expired');

    try {
      await expect(
        apiClient.get('/api/v1/outage', z.object({}), { page: 1 }),
      ).rejects.toMatchObject({ status, code: 'unavailable' });
    } finally {
      unavailable.stop();
      expired.stop();
    }

    expect(unavailable.events).toHaveLength(1);
    expect(unavailable.events[0].detail).toEqual({
      status,
      path: '/api/v1/outage',
      // No human input in this test: the request is classified background.
      background: true,
    });
    expect(expired.events).toHaveLength(0);
    expect(refreshCalls).toHaveLength(0);
  });

  it('keeps the backend code of a 503 auth_unavailable as serverCode', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/outage`, () =>
        HttpResponse.json(
          { error: 'Authentication is temporarily unavailable.', ok: false, code: 'auth_unavailable' },
          { status: 503 },
        ),
      ),
    );
    const { apiClient } = await import('./api-client');

    await expect(apiClient.get('/api/v1/outage', z.object({}))).rejects.toMatchObject({
      status: 503,
      code: 'unavailable',
      serverCode: 'auth_unavailable',
    });
  });

  it('recognises auth_unavailable in a FastAPI {detail: {code}} body', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/outage`, () =>
        HttpResponse.json(
          { detail: { code: 'auth_unavailable', message: 'Try again.' } },
          { status: 503 },
        ),
      ),
    );
    const { apiClient } = await import('./api-client');

    await expect(apiClient.get('/api/v1/outage', z.object({}))).rejects.toMatchObject({
      status: 503,
      code: 'unavailable',
      serverCode: 'auth_unavailable',
    });
  });

  it('a 401 that names auth_unavailable is an outage: no refresh, no session-expired', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/outage`, () =>
        HttpResponse.json(
          { error: 'Auth unavailable.', ok: false, code: 'auth_unavailable' },
          { status: 401 },
        ),
      ),
    );
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    tokenModule.setAccessToken('manager-token', 'manager');
    const unavailable = collectWindowEvents('system:unavailable');
    const expired = collectWindowEvents('auth:session-expired');

    try {
      await expect(apiClient.get('/api/v1/outage', z.object({}))).rejects.toMatchObject({
        status: 401,
        code: 'unavailable',
      });
    } finally {
      unavailable.stop();
      expired.stop();
    }

    expect(refreshCalls).toHaveLength(0);
    expect(expired.events).toHaveLength(0);
    expect(unavailable.events).toHaveLength(1);
    expect(tokenModule.getAccessToken()).toBe('manager-token');
  });

  it('a network failure becomes ApiRequestError(0, "unavailable") and dispatches system:unavailable', async () => {
    server.use(http.get(`${API_ORIGIN}/api/v1/outage`, () => HttpResponse.error()));
    const { apiClient, ApiRequestError } = await import('./api-client');
    const unavailable = collectWindowEvents('system:unavailable');

    let caught: unknown;
    try {
      await apiClient.get('/api/v1/outage', z.object({}));
    } catch (error) {
      caught = error;
    } finally {
      unavailable.stop();
    }

    expect(caught).toBeInstanceOf(ApiRequestError);
    expect(caught).toMatchObject({ status: 0, code: 'unavailable' });
    expect(unavailable.events.map((event) => event.detail)).toEqual([
      { status: 0, path: '/api/v1/outage', background: true },
    ]);
  });

  it('an AbortError is rethrown untouched, not converted to unavailable', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abort);
    const { apiClient } = await import('./api-client');
    const unavailable = collectWindowEvents('system:unavailable');

    try {
      await expect(apiClient.get('/api/v1/things', z.object({}))).rejects.toBe(abort);
    } finally {
      unavailable.stop();
    }

    expect(unavailable.events).toHaveLength(0);
  });

  it('a 500 stays server_error and is not reported as unavailable', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/outage`, () =>
        HttpResponse.json({ error: 'Boom.', ok: false }, { status: 500 }),
      ),
    );
    const { apiClient } = await import('./api-client');
    const unavailable = collectWindowEvents('system:unavailable');

    try {
      await expect(apiClient.get('/api/v1/outage', z.object({}))).rejects.toMatchObject({
        status: 500,
        code: 'server_error',
      });
    } finally {
      unavailable.stop();
    }

    expect(unavailable.events).toHaveLength(0);
  });
});

describe('invalid_response is its own failure', () => {
  it('a schema mismatch is status 0 invalid_response, never unavailable', async () => {
    const { apiClient } = await import('./api-client');
    const unavailable = collectWindowEvents('system:unavailable');

    try {
      await expect(
        apiClient.get('/api/v1/things', z.object({ ok: z.literal(false) })),
      ).rejects.toMatchObject({ status: 0, code: 'invalid_response' });
    } finally {
      unavailable.stop();
    }

    expect(unavailable.events).toHaveLength(0);
  });

  it('a 200 whose body is not JSON (e.g. an SPA index.html) is invalid_response', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/v1/html`, () =>
        new HttpResponse('<!doctype html><html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );
    const { apiClient } = await import('./api-client');

    await expect(apiClient.get('/api/v1/html', z.object({}))).rejects.toMatchObject({
      status: 0,
      code: 'invalid_response',
    });
  });
});

describe('credential endpoints skip refresh-on-401', () => {
  it('a sign-in 401 (wrong password) neither refreshes nor dispatches session-expired', async () => {
    server.use(
      http.post(`${API_ORIGIN}/api/v1/auth/sign-in`, () =>
        HttpResponse.json({ error: 'Invalid credentials.', ok: false }, { status: 401 }),
      ),
    );
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    tokenModule.setAuthScope('manager');
    const expired = collectWindowEvents('auth:session-expired');

    try {
      await expect(
        apiClient.post('/api/v1/auth/sign-in', z.object({}), {
          email: 'a@b.c',
          password: 'wrong',
        }),
      ).rejects.toMatchObject({
        status: 401,
        code: 'unauthorized',
        message: 'Invalid credentials.',
      });
    } finally {
      expired.stop();
    }

    expect(refreshCalls).toHaveLength(0);
    expect(expired.events).toHaveLength(0);
  });

  it('a floor sign-in 401 leaves the floor storage and session-expired alone', async () => {
    server.use(
      http.post(`${API_ORIGIN}/api/v1/auth/sign-in`, () =>
        HttpResponse.json({ error: 'Invalid credentials.', ok: false }, { status: 401 }),
      ),
    );
    const tokenModule = await import('./auth-token');
    const { apiClient } = await import('./api-client');
    tokenModule.setAuthScope('floor');
    tokenModule.setAccessToken('floor-token');
    const expired = collectWindowEvents('auth:session-expired');

    try {
      await expect(
        apiClient.post('/api/v1/auth/sign-in', z.object({}), {}),
      ).rejects.toMatchObject({ status: 401, code: 'unauthorized' });
    } finally {
      expired.stop();
    }

    expect(expired.events).toHaveLength(0);
    expect(
      window.localStorage.getItem(tokenModule.FLOOR_ACCESS_TOKEN_STORAGE_KEY),
    ).toBe('floor-token');
  });
});
