import { env } from './env';

export const FLOOR_ACCESS_TOKEN_STORAGE_KEY = 'beyo.floor.access_token';

let _accessToken: string | null = null;
let _authScope: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null, scope?: string): void {
  if (scope) {
    setAuthScope(scope);
  }

  _accessToken = token;

  if (_authScope !== 'floor') return;

  try {
    if (token) {
      window.localStorage.setItem(FLOOR_ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(FLOOR_ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Device storage may be unavailable (for example, browser privacy policy).
    // Memory remains authoritative for the current floor-app session.
  }
}

export function setAuthScope(scope: string): void {
  _authScope = scope;
}

type TokenClaims = {
  user_id: string;
  username: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_role_id: string;
  role_name: "admin" | "manager" | "worker" | "seller";
  workspace_role_name:
    | "admin"
    | "manager"
    | "worker"
    | "seller"
    | "wood_worker"
    | "upholstery_worker"
    | "quality_control"
    | null;
  workspace_specialization:
    | "wood_worker"
    | "upholstery_worker"
    | "quality_control"
    | null;
  app_scope: "admin" | "manager" | "worker" | "seller" | "floor";
  time_zone: string;
  backend_permissions: string[];
  ui: {
    apps: string[];
    pages: string[];
    buttons: string[];
    actions: string[];
    query_filters: string[];
  };
  jti: string;
  exp: number;
};

export function decodeTokenClaims(): TokenClaims | null {
  if (!_accessToken) return null;

  try {
    const payload = _accessToken.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as TokenClaims;
  } catch {
    return null;
  }
}

/**
 * The answer of a session refresh.
 *
 * - `'ok'`: a new access token is in memory.
 * - `'invalid'`: the backend rejected the session (a 401/403 carrying an auth
 *   error code, e.g. `auth_refresh_rejected`), or there is no session to
 *   refresh (no scope; floor sessions are never refreshable). The token has
 *   been cleared. Only this answer means "signed out".
 * - `'unavailable'`: the session could not be checked — network failure, any
 *   5xx (including 503 `auth_unavailable`), an unreadable 2xx, or any other
 *   answer that is not a credential verdict. The token is kept.
 */
export type RefreshOutcome = 'ok' | 'invalid' | 'unavailable';

let _refreshPromise: Promise<RefreshOutcome> | null = null;

export function refreshAccessToken(scope?: string): Promise<RefreshOutcome> {
  if (scope) {
    setAuthScope(scope);
  }

  if (_authScope === 'floor') {
    // Floor tokens cannot be refreshed: a 401 on floor is the revocation.
    setAccessToken(null);
    return Promise.resolve('invalid');
  }

  if (_refreshPromise) return _refreshPromise;

  if (!_authScope) {
    return Promise.resolve('invalid');
  }

  _refreshPromise = _executeRefresh(_authScope).finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

/** Backend codes that mean "cannot check right now", whatever the status. */
const UNAVAILABLE_SERVER_CODES: ReadonlySet<string> = new Set(['auth_unavailable']);
/** Pre-503 backends answer a Redis outage on refresh as a 401 with this reason. */
const UNAVAILABLE_REFRESH_REASONS: ReadonlySet<string> = new Set([
  'refresh_blocklist_unavailable',
]);

async function readRefreshRejection(
  response: Response,
): Promise<{ code?: string; reason?: string }> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return {};
    const { code, reason } = body as { code?: unknown; reason?: unknown };
    return {
      code: typeof code === 'string' ? code : undefined,
      reason: typeof reason === 'string' ? reason : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Conservative on purpose: only a 401/403 whose body carries an auth error
 * code (`auth_*`, e.g. `auth_refresh_rejected`) is a verdict on the session.
 * Anything else — a 401 without a code (a proxy, not the backend), 400/404/422,
 * 429, 5xx — says nothing about the credentials, so the token is kept.
 */
function isCredentialRejection(
  status: number,
  rejection: { code?: string; reason?: string },
): boolean {
  if (status !== 401 && status !== 403) return false;
  const { code, reason } = rejection;
  if (!code || !code.startsWith('auth_')) return false;
  if (UNAVAILABLE_SERVER_CODES.has(code)) return false;
  if (reason && UNAVAILABLE_REFRESH_REASONS.has(reason)) return false;
  return true;
}

async function _executeRefresh(scope: string): Promise<RefreshOutcome> {
  let response: Response;
  try {
    const base = env.VITE_API_URL || window.location.origin;
    const refreshUrl = new URL('/api/v1/auth/refresh', base);
    refreshUrl.searchParams.set('scope', scope);
    response = await fetch(refreshUrl.toString(), {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    return 'unavailable';
  }

  if (!response.ok) {
    if (isCredentialRejection(response.status, await readRefreshRejection(response))) {
      setAccessToken(null);
      return 'invalid';
    }
    return 'unavailable';
  }

  try {
    const body = (await response.json()) as {
      ok: boolean;
      data?: { access_token?: unknown };
      warnings: string[];
    };
    const token = body.data?.access_token;
    if (typeof token !== 'string' || token.length === 0) return 'unavailable';
    setAccessToken(token);
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

/**
 * Restores the session at app boot. Floor restores the stored kiosk token
 * (`'ok'`) or has none (`'invalid'`); other scopes refresh.
 */
export async function initSession(scope: string): Promise<RefreshOutcome> {
  setAuthScope(scope);

  if (scope === 'floor') {
    // Floor kiosks restore storage only during boot. Cross-tab synchronization is
    // intentionally out of scope for the single fullscreen device model.
    try {
      _accessToken = window.localStorage.getItem(FLOOR_ACCESS_TOKEN_STORAGE_KEY);
    } catch {
      _accessToken = null;
    }
    return _accessToken !== null ? 'ok' : 'invalid';
  }

  return refreshAccessToken(scope);
}
