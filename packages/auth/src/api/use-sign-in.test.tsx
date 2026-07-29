import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import {
  FLOOR_ACCESS_TOKEN_STORAGE_KEY,
  getAccessToken,
  setAccessToken,
  setAuthScope,
} from '@beyo/api-client';
import { useAuthStore } from '../store/auth.store';
import { useSignInMutation } from './use-sign-in';

const API_ORIGIN = 'http://api.test';
const floorToken = createJwt({
  user_id: 'usr_floor',
  username: 'Floor Manager',
  workspace_id: 'ws_floor',
  workspace_role_id: 'wr_manager',
  role_name: 'manager',
  workspace_role_name: 'manager',
  workspace_specialization: null,
  app_scope: 'floor',
  time_zone: 'Europe/Stockholm',
  backend_permissions: [],
  ui: {
    apps: [],
    pages: [],
    buttons: [],
    actions: [],
    query_filters: [],
  },
  jti: 'jti_floor',
  exp: 0,
});

let receivedBody: unknown;

const server = setupServer(
  http.post(`${API_ORIGIN}/api/v1/auth/sign-in`, async ({ request }) => {
    receivedBody = await request.json();
    return HttpResponse.json({
      ok: true,
      warnings: [],
      data: {
        access_token: floorToken,
        user: {
          user_id: 'usr_floor',
          email: 'manager@shop.com',
          username: 'Floor Manager',
          workspace_id: 'ws_floor',
          workspace_role_id: 'wr_manager',
          role_name: 'manager',
          workspace_role_name: 'manager',
          workspace_specialization: null,
          app_scope: 'floor',
          time_zone: 'Europe/Stockholm',
          backend_permissions: [],
          ui: {
            apps: [],
            pages: [],
            buttons: [],
            actions: [],
            query_filters: [],
          },
        },
        workspace_id: 'ws_floor',
      },
    });
  }),
);

function createJwt(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    window
      .btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/u, '');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  receivedBody = undefined;
  window.localStorage.clear();
  setAuthScope('floor');
  setAccessToken(null);
  useAuthStore.getState().clearAuth();
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useSignInMutation floor scope', () => {
  it('sends app_scope=floor and persists the returned device token', async () => {
    const { result } = renderHook(() => useSignInMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'manager@shop.com',
        password: 'secret',
        appScope: 'floor',
      });
    });

    expect(receivedBody).toEqual({
      email: 'manager@shop.com',
      password: 'secret',
      app_scope: 'floor',
    });
    expect(getAccessToken()).toBe(floorToken);
    expect(window.localStorage.getItem(FLOOR_ACCESS_TOKEN_STORAGE_KEY)).toBe(floorToken);
    expect(useAuthStore.getState().user?.appScope).toBe('floor');
  });
});
