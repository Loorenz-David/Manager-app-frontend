import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';

const API_ORIGIN = 'http://api.test';
const searches: string[] = [];

const server = setupServer(
  http.get(`${API_ORIGIN}/api/v1/things`, ({ request }) => {
    searches.push(new URL(request.url).search);
    return HttpResponse.json({ ok: true });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', API_ORIGIN);
  searches.length = 0;
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
