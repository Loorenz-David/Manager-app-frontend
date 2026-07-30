import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { workerShiftMockHandlers } from '@beyo/worker-shifts/mocks';

function encodeMockJwt(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const workspaceId = 'wrk_floor_mock';
const userId = 'usr_floor_mock_manager';

const accessToken = encodeMockJwt({
  user_id: userId,
  username: 'Floor Manager',
  workspace_id: workspaceId,
  workspace_name: 'Beyo Workshop',
  workspace_role_id: 'wrole_floor_mock_manager',
  workspace_role_name: 'manager',
  role_name: 'manager',
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
  jti: 'floor-mock-device',
  exp: 4_102_444_800,
});

const floorAuthHandlers = [
  http.post('/api/v1/auth/sign-in', () =>
    HttpResponse.json({
      ok: true,
      data: {
        access_token: accessToken,
        user: {
          user_id: userId,
          email: 'manager@example.com',
          username: 'Floor Manager',
          workspace_id: workspaceId,
          workspace_role_id: 'wrole_floor_mock_manager',
          workspace_role_name: 'manager',
          workspace_name: 'Beyo Workshop',
          role_name: 'manager',
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
        workspace_id: workspaceId,
      },
      warnings: [],
    }),
  ),
  http.get('/api/v1/users/me', () =>
    HttpResponse.json({
      ok: true,
      data: {
        user: {
          client_id: userId,
          email: 'manager@example.com',
          username: 'Floor Manager',
        },
      },
      warnings: [],
    }),
  ),
  http.post('/api/v1/auth/logout', () =>
    HttpResponse.json({ ok: true, data: {}, warnings: [] }),
  ),
];

const worker = setupWorker(...floorAuthHandlers, ...workerShiftMockHandlers);

export async function startFloorMockWorker(): Promise<void> {
  await worker.start({ onUnhandledRequest: 'bypass' });
}
