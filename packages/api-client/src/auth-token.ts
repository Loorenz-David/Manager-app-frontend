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

let _refreshPromise: Promise<boolean> | null = null;

export function refreshAccessToken(scope?: string): Promise<boolean> {
  if (scope) {
    setAuthScope(scope);
  }

  if (_authScope === 'floor') {
    setAccessToken(null);
    return Promise.resolve(false);
  }

  if (_refreshPromise) return _refreshPromise;

  if (!_authScope) {
    return Promise.resolve(false);
  }

  _refreshPromise = _executeRefresh(_authScope).finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

async function _executeRefresh(scope: string): Promise<boolean> {
  try {
    const base = env.VITE_API_URL || window.location.origin;
    const refreshUrl = new URL('/api/v1/auth/refresh', base);
    refreshUrl.searchParams.set('scope', scope);
    const response = await fetch(refreshUrl.toString(), {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      setAccessToken(null);
      return false;
    }

    const body = (await response.json()) as {
      ok: boolean;
      data: { access_token: string };
      warnings: string[];
    };
    setAccessToken(body.data.access_token);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function initSession(scope: string): Promise<boolean> {
  setAuthScope(scope);

  if (scope === 'floor') {
    // Floor kiosks restore storage only during boot. Cross-tab synchronization is
    // intentionally out of scope for the single fullscreen device model.
    try {
      _accessToken = window.localStorage.getItem(FLOOR_ACCESS_TOKEN_STORAGE_KEY);
    } catch {
      _accessToken = null;
    }
    return _accessToken !== null;
  }

  return refreshAccessToken(scope);
}
