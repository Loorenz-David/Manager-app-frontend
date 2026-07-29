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

    await expect(restoredModule.initSession('floor')).resolves.toBe(true);
    expect(restoredModule.getAccessToken()).toBe('floor-token');
    expect(requestLog).toEqual([]);
  });

  it('never reads, writes, or clears storage for non-floor scopes', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const tokenModule = await import('./auth-token');

    for (const scope of ['admin', 'manager', 'worker', 'seller']) {
      await expect(tokenModule.initSession(scope)).resolves.toBe(true);
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
