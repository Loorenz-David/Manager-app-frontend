import { env } from '@/lib/env';

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

type TokenClaims = {
  user_id: string;
  username: string;
  workspace_id: string;
  role_name: string;
  backend_permissions: string[];
  ui: {
    apps: string[];
    pages: string[];
    buttons: string[];
    actions: string[];
    query_filters: string[];
  };
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

export function refreshAccessToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = _executeRefresh().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

async function _executeRefresh(): Promise<boolean> {
  try {
    const base = env.VITE_API_URL || window.location.origin;
    const response = await fetch(`${base}/api/v1/auth/refresh`, {
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

export async function initSession(): Promise<boolean> {
  return refreshAccessToken();
}
