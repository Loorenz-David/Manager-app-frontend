# PLAN_api_client_auth_layer_20260520

## Metadata

- Plan ID: `PLAN_api_client_auth_layer_20260520`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T14:12:30Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Implement the API client layer — `src/lib/env.ts`, `src/lib/auth-token.ts`, `src/lib/api-client.ts` — and the full auth feature lifecycle: auth store, sign-in, sign-out, `AuthProvider`, `useAuth` hook, route guards.
- Business/user intent: All subsequent feature API functions (`fetchTasks`, `createItem`, etc.) can import `apiClient` and make authenticated requests. The app boots with a restored session (if the httpOnly refresh cookie exists), handles token expiry transparently, and redirects to sign-in when the session ends.
- Non-goals: OAuth/SSO sign-in, user profile feature (`features/profile/`), permissions/RBAC UI, push notifications.

## Scope

- In scope:
  - `src/lib/env.ts` — Zod-validated env config (`VITE_API_URL` only)
  - `src/vite-env.d.ts` — `ImportMetaEnv` augmentation
  - `src/types/api.ts` — Fix `ApiErrorSchema` to match actual backend error shape; keep `ApiEnvelopeSchema`
  - `src/lib/auth-token.ts` — In-memory access token, refresh singleton, `initSession`, `decodeTokenClaims`
  - `src/lib/api-client.ts` — HTTP wrapper, `ApiRequestError`, 401→refresh→retry cycle, Zod validation
  - `src/store/auth.store.ts` — Replace current broken implementation (token stored in Zustand is a contract violation)
  - `src/features/auth/api/use-sign-in.ts` — Email/password sign-in mutation
  - `src/features/auth/api/use-sign-out.ts` — Sign-out mutation
  - `src/features/auth/components/AuthProvider.tsx` — Boot session restoration + session-expired handler
  - `src/features/auth/hooks/use-auth.ts` — Public auth identity hook
  - `src/features/auth/components/ProtectedRoute.tsx` — Remove DEV bypass, use contract version
  - `src/features/auth/index.ts` — Add exports for new files
  - `src/app/RootRoute.tsx` — Wire `AuthProvider` wrapping `<Outlet />`
  - `.env` — Create with `VITE_API_URL=http://localhost:8000` (for local development)
- Out of scope: OAuth, sign-up, password reset, profile feature, permissions guard
- Assumptions:
  - `ulid` package is already installed
  - `zustand`, `@tanstack/react-query`, `react-router-dom` are installed (they are — verified in existing code)
  - The backend refresh endpoint returns `{ ok: true, data: { access_token: string }, warnings: [] }`
  - The app runs on the same origin as the API in production (CORS + credentials handled by backend)

## Clarifications required

*(none — all backend shapes confirmed from backend source)*

## Acceptance criteria

1. `npm run typecheck` passes with zero errors after all files are written
2. `src/lib/api-client.ts` and `src/lib/auth-token.ts` are the **only** files that call `fetch`
3. The access token is stored in a plain module-level `let` variable in `auth-token.ts` — never in Zustand, localStorage, or sessionStorage
4. On app boot, if a valid httpOnly refresh cookie exists, the user is authenticated without re-entering credentials
5. If a mid-session refresh fails, `auth:session-expired` is dispatched, `AuthProvider` clears the store and redirects to `/sign-in`
6. `ProtectedRoute` redirects unauthenticated users to `/sign-in`; `GuestRoute` redirects authenticated users to `/`

## Contracts and skills

### Contracts loaded

- `architecture/04_api_client.md`: primary contract — defines the two-file layer, JWT token strategy, refresh singleton, `ApiRequestError`, `apiClient` object shape, session expiry event
- `architecture/12_auth.md`: auth feature lifecycle — `AuthProvider`, `useAuth`, sign-in/sign-out flows, auth store shape, route guards
- `architecture/13_errors.md`: error hierarchy — `ApiRequestError` is the only thrown error type
- `architecture/03_environment.md`: env validation pattern — `src/lib/env.ts` with Zod, `ImportMetaEnv` augmentation
- `architecture/02_types.md`: branded ID types — `UserId`, `WorkspaceId` from `src/types/common.ts`

### Local extensions loaded

*(no `04_api_client_local.md` or `12_auth_local.md` found — canonical contracts apply directly)*

### File read intent — pattern vs. relational

Permitted reads (relational — understanding what exists):
- `src/types/api.ts` — to see existing `ApiEnvelopeSchema` shape (kept as-is)
- `src/types/common.ts` — to see existing branded types (`UserId`, `WorkspaceId`)
- `src/store/auth.store.ts` — to understand what must be replaced
- `src/features/auth/components/ProtectedRoute.tsx` — to see what must be replaced
- `src/app/RootRoute.tsx` — to see where `AuthProvider` is wired
- `src/lib/routes.ts` — to get `ROUTES.signIn` and `ROUTES.home`
- `src/components/ui/PageSkeleton.tsx` — to verify boot loading fallback component

Prohibited:
- Reading another feature's action hook to understand sign-in mutation structure → `08_hooks.md` covers it
- Reading another store to understand Zustand shape → `06_client_state.md` covers it

### Skill selection

- Primary skill: N/A (foundational infrastructure, not a CRUD feature)

## Backend-specific deviations from canonical contracts

These deviations are based on reading the actual backend source. Codex **must** apply these instead of the canonical contract examples where they differ.

### 1 — Backend error shape

The backend returns errors as:
```json
{ "error": "Human-readable message string.", "ok": false }
```

There is **no** `code` field and **no** `field_errors` field in backend errors. The `ApiErrorSchema` in `src/types/api.ts` must reflect this.

`ApiRequestError.code` is derived from the HTTP status by the frontend:

```ts
function codeFromStatus(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 422: return 'unprocessable';
    case 500: return 'server_error';
    case 502:
    case 503: return 'network_error';
    default:  return 'unknown_error';
  }
}
```

`ApiRequestError` has **no** `fieldErrors` parameter since the backend does not return field-level errors.

### 2 — Refresh response envelope

The `/api/v1/auth/refresh` endpoint wraps its response in the standard `build_ok` envelope:
```json
{ "ok": true, "data": { "access_token": "..." }, "warnings": [] }
```

`_executeRefresh` in `auth-token.ts` must read `data.data.access_token`, not `data.access_token`:

```ts
const data = await response.json() as { ok: boolean; data: { access_token: string }; warnings: string[] };
setAccessToken(data.data.access_token);
```

### 3 — Sign-in endpoint and body

- Path: `POST /api/v1/auth/sign-in`
- Body: `{ email: string, password: string, app_scope: 'admin' }`
- Response (wrapped in envelope):
```json
{
  "ok": true,
  "data": {
    "access_token": "...",
    "user": {
      "client_id": "usr_...",
      "email": "...",
      "username": "...",
      "role": "...",
      "backend_permissions": [...],
      "ui": [...]
    },
    "workspace_id": "ws_..."
  },
  "warnings": []
}
```

### 4 — Sign-out endpoint

- Path: `POST /api/v1/auth/logout` (not `/sign-out`)

### 5 — Auth store User type

Matches the sign-in response user shape — NOT the canonical contract's `{ name, roles, permissions }`:

```ts
type AuthUser = {
  id:                   UserId;
  email:                string;
  username:             string;
  role:                 string;
  backend_permissions:  string[];
  ui:                   string[];
};
```

### 6 — AuthProvider boot: JWT claims for workspace/role

`GET /api/v1/users/me` returns only user profile fields (no workspace_id, role, or permissions). To restore the full auth state on boot, `AuthProvider` must:

1. Call `initSession()` → access token stored in memory
2. Call `decodeTokenClaims()` from `auth-token.ts` to read `workspace_id`, `role_name`, `backend_permissions`, `ui` from the JWT payload (client-side decode, no verification — backend verifies on every request)
3. Call `apiClient.get('/api/v1/users/me', ...)` for `client_id`, `email`, `username`
4. Combine both into `setUser(user, workspaceId)`

`decodeTokenClaims()` in `auth-token.ts`:
```ts
type TokenClaims = {
  user_id: string;
  username: string;
  workspace_id: string;
  role_name: string;
  backend_permissions: string[];
  ui: string[];
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
```

## Implementation plan

### Step 1 — Create `.env`

File: `.env` (at the app root: `apps/managers-app/ManagerBeyo-app-managers/.env`)

```
VITE_API_URL=http://localhost:8000
```

This file is gitignored via `.env.local`. Committing `.env` with a safe localhost default is fine per `03_environment.md`.

---

### Step 2 — Create `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

### Step 3 — Create `src/lib/env.ts`

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_API_URL: z.string().url(),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check your .env file.');
}

export const env = parsed.data;
```

---

### Step 4 — Update `src/types/api.ts`

Replace the **entire file** with:

```ts
import { z } from 'zod';

export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema,
    warnings: z.array(z.string()),
  });

// Backend error shape: { "error": "message string", "ok": false }
// No code field. No field_errors. Code is derived from HTTP status by the frontend.
export const ApiErrorSchema = z.object({
  error: z.string(),
  ok: z.literal(false),
});

export type ApiResponse<T> = {
  ok: boolean;
  data: T;
  warnings: string[];
};
```

---

### Step 5 — Create `src/lib/auth-token.ts`

```ts
import { env } from '@/lib/env';

// ─── In-memory token storage ──────────────────────────────────────────────────

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

// ─── JWT claims decoder (no verification — backend verifies on every request) ─

type TokenClaims = {
  user_id: string;
  username: string;
  workspace_id: string;
  role_name: string;
  backend_permissions: string[];
  ui: string[];
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

// ─── Refresh singleton ────────────────────────────────────────────────────────
//
// Multiple concurrent requests can all receive 401 at the same time.
// Without a singleton, each would fire its own refresh call — causing
// a race where only one succeeds and the rest invalidate each other.
// The singleton ensures exactly one refresh call runs at a time;
// every concurrent caller awaits the same promise.

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
    const response = await fetch(`${env.VITE_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      setAccessToken(null);
      return false;
    }

    // Backend wraps refresh response in build_ok envelope: { ok, data: { access_token }, warnings }
    const body = await response.json() as { ok: boolean; data: { access_token: string }; warnings: string[] };
    setAccessToken(body.data.access_token);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

// ─── Session initialisation (called once on app boot) ─────────────────────────

export async function initSession(): Promise<boolean> {
  return refreshAccessToken();
}
```

---

### Step 6 — Create `src/lib/api-client.ts`

```ts
import { z } from 'zod';
import { env } from '@/lib/env';
import { ApiErrorSchema } from '@/types/api';
import { getAccessToken, refreshAccessToken, setAccessToken } from '@/lib/auth-token';

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function codeFromStatus(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 422: return 'unprocessable';
    case 500: return 'server_error';
    case 502:
    case 503: return 'network_error';
    default:  return 'unknown_error';
  }
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(path, env.VITE_API_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function handleErrorResponse(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(response.status, codeFromStatus(response.status), response.statusText);
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    throw new ApiRequestError(response.status, codeFromStatus(response.status), parsed.data.error);
  }

  throw new ApiRequestError(response.status, codeFromStatus(response.status), 'An unexpected error occurred.');
}

// ─── Request internals ────────────────────────────────────────────────────────

type RequestOptions = {
  method?:  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?:    unknown;
  params?:  Record<string, string | number | boolean | undefined>;
};

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = 'GET', body, params } = options;

  const url   = buildUrl(path, params);
  const token = getAccessToken();

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // ── 401: attempt exactly one token refresh, then retry ──────────────────────
  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request(path, schema, options, true);
    }

    setAccessToken(null);
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
    throw new ApiRequestError(401, 'unauthorized', 'Session expired. Please sign in again.');
  }

  // ── Non-2xx: parse and throw a typed error ───────────────────────────────────
  if (!response.ok) {
    return handleErrorResponse(response);
  }

  // ── 2xx: validate response with Zod ──────────────────────────────────────────
  const json: unknown = response.status === 204 ? {} : await response.json();
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new ApiRequestError(
      502,
      'invalid_response',
      `API response did not match expected schema: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, schema: z.ZodType<T>, params?: RequestOptions['params']) =>
    request(path, schema, { method: 'GET', params }),

  post: <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    request(path, schema, { method: 'POST', body }),

  put: <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    request(path, schema, { method: 'PUT', body }),

  patch: <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    request(path, schema, { method: 'PATCH', body }),

  delete: <T>(path: string, schema: z.ZodType<T>) =>
    request(path, schema, { method: 'DELETE' }),
};
```

---

### Step 7 — Update `src/store/auth.store.ts`

Replace the **entire file** with:

```ts
import { create } from 'zustand';
import type { UserId, WorkspaceId } from '@/types/common';

type AuthUser = {
  id:                   UserId;
  email:                string;
  username:             string;
  role:                 string;
  backend_permissions:  string[];
  ui:                   string[];
};

type AuthState = {
  user:            AuthUser | null;
  workspaceId:     WorkspaceId | null;
  isAuthenticated: boolean;
  setUser:         (user: AuthUser, workspaceId: WorkspaceId) => void;
  clearAuth:       () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  workspaceId:     null,
  isAuthenticated: false,

  setUser: (user, workspaceId) =>
    set({ user, workspaceId, isAuthenticated: true }),

  clearAuth: () =>
    set({ user: null, workspaceId: null, isAuthenticated: false }),
}));

export const selectUser            = (s: AuthState) => s.user;
export const selectWorkspaceId     = (s: AuthState) => s.workspaceId;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
```

---

### Step 8 — Create `src/features/auth/api/use-sign-in.ts`

```ts
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { setAccessToken } from '@/lib/auth-token';
import { useAuthStore } from '@/store/auth.store';
import type { UserId, WorkspaceId } from '@/types/common';

const SignInResponseSchema = ApiEnvelopeSchema(
  z.object({
    access_token: z.string(),
    user: z.object({
      client_id:            z.string().transform((v) => v as UserId),
      email:                z.string(),
      username:             z.string(),
      role:                 z.string(),
      backend_permissions:  z.array(z.string()),
      ui:                   z.array(z.string()),
    }),
    workspace_id: z.string().transform((v) => v as WorkspaceId),
  }),
);

type SignInCredentials = {
  email: string;
  password: string;
};

async function signIn(credentials: SignInCredentials) {
  const result = await apiClient.post(
    '/api/v1/auth/sign-in',
    SignInResponseSchema,
    { ...credentials, app_scope: 'admin' },
  );

  setAccessToken(result.data.access_token);
  useAuthStore.getState().setUser(
    {
      id:                   result.data.user.client_id,
      email:                result.data.user.email,
      username:             result.data.user.username,
      role:                 result.data.user.role,
      backend_permissions:  result.data.user.backend_permissions,
      ui:                   result.data.user.ui,
    },
    result.data.workspace_id,
  );

  return result;
}

export function useSignInMutation() {
  return useMutation({ mutationFn: signIn });
}
```

---

### Step 9 — Create `src/features/auth/api/use-sign-out.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { setAccessToken } from '@/lib/auth-token';
import { useAuthStore } from '@/store/auth.store';

const SignOutResponseSchema = ApiEnvelopeSchema(z.object({}));

async function signOut() {
  await apiClient.post('/api/v1/auth/logout', SignOutResponseSchema, {});
  setAccessToken(null);
  useAuthStore.getState().clearAuth();
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
    },
  });
}
```

---

### Step 10 — Create `src/features/auth/hooks/use-auth.ts`

```ts
import { useAuthStore, selectUser, selectWorkspaceId, selectIsAuthenticated } from '@/store/auth.store';
import { useSignOutMutation } from '@/features/auth/api/use-sign-out';

export function useAuth() {
  const user            = useAuthStore(selectUser);
  const workspaceId     = useAuthStore(selectWorkspaceId);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { mutate: signOut, isPending: isSigningOut } = useSignOutMutation();

  return { user, workspaceId, isAuthenticated, signOut, isSigningOut };
}
```

---

### Step 11 — Create `src/features/auth/components/AuthProvider.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { initSession, decodeTokenClaims } from '@/lib/auth-token';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { useAuthStore } from '@/store/auth.store';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ROUTES } from '@/lib/routes';
import type { UserId, WorkspaceId } from '@/types/common';

const SelfProfileResponseSchema = ApiEnvelopeSchema(
  z.object({
    user: z.object({
      client_id: z.string().transform((v) => v as UserId),
      email:     z.string(),
      username:  z.string(),
    }),
  }),
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const setUser     = useAuthStore((s) => s.setUser);
  const clearAuth   = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  // ── Boot: restore session from httpOnly refresh cookie ──────────────────────
  useEffect(() => {
    initSession()
      .then(async (ok) => {
        if (!ok) return;

        const claims = decodeTokenClaims();
        if (!claims) return;

        const profile = await apiClient.get('/api/v1/users/me', SelfProfileResponseSchema);

        setUser(
          {
            id:                   profile.data.user.client_id,
            email:                profile.data.user.email,
            username:             profile.data.user.username,
            role:                 claims.role_name,
            backend_permissions:  claims.backend_permissions,
            ui:                   claims.ui,
          },
          claims.workspace_id as WorkspaceId,
        );
      })
      .finally(() => setReady(true));
  }, []);

  // ── Mid-session expiry: API client signals when refresh fails ───────────────
  useEffect(() => {
    const handleExpired = () => {
      clearAuth();
      queryClient.clear();
      navigate(ROUTES.signIn, { replace: true });
    };

    window.addEventListener('auth:session-expired', handleExpired);
    return () => window.removeEventListener('auth:session-expired', handleExpired);
  }, [clearAuth, queryClient, navigate]);

  if (!ready) return <PageSkeleton />;

  return <>{children}</>;
}
```

---

### Step 12 — Update `src/features/auth/components/ProtectedRoute.tsx`

Replace the **entire file** with the clean contract version (removes the DEV bypass — `AuthProvider` now handles session restoration, so DEV mode works correctly):

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { selectIsAuthenticated, useAuthStore } from '@/store/auth.store';

export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate replace to={ROUTES.signIn} />;
}
```

---

### Step 13 — Update `src/features/auth/index.ts`

Replace the **entire file** with:

```ts
export { AuthProvider }        from './components/AuthProvider';
export { GuestRoute }          from './components/GuestRoute';
export { ProtectedRoute }      from './components/ProtectedRoute';
export { useAuth }             from './hooks/use-auth';
export { useSignInMutation }   from './api/use-sign-in';
export { useSignOutMutation }  from './api/use-sign-out';
```

---

### Step 14 — Update `src/app/RootRoute.tsx`

Wire `AuthProvider` inside `<SurfaceProvider>`. `AuthProvider` uses `useNavigate()` so it must be inside the router tree (which it is — `RootRoute` renders inside `RouterProvider`):

```tsx
import { Outlet } from 'react-router-dom';
import { SurfaceProvider } from '@/providers/SurfaceProvider';
import { AuthProvider } from '@/features/auth';

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </SurfaceProvider>
  );
}
```

---

### Step 15 — Run typecheck

```
npm run typecheck
```

Expected: zero errors.

If errors appear in files that consume `useAuthStore` (e.g., other components that used the old `token` or `userId` fields), update them to use the new selectors or fields.

## Risks and mitigations

- Risk: `ProtectedRoute` DEV bypass removed — developers can no longer bypass auth in development.
  Mitigation: `AuthProvider` now restores session from the httpOnly refresh cookie, so any developer with a valid local session will stay authenticated. For fresh local setup, developers sign in once at `/sign-in`. If no backend is running locally, `initSession()` fails silently (returns false), and the user sees the sign-in page — expected behavior.

- Risk: `src/store/auth.store.ts` shape changes break existing callers that used `userId` or `token`.
  Mitigation: Step 15 runs typecheck; any callers using old fields will produce TS errors. The only current callers are `ProtectedRoute.tsx` and `GuestRoute.tsx`, both of which use `selectIsAuthenticated` — which is unchanged.

- Risk: `AuthProvider` calls `apiClient.get('/api/v1/users/me', ...)` during boot, but `apiClient` dispatches `auth:session-expired` on 401. If `/me` returns 401 despite a fresh token from refresh, the session-expired handler fires immediately on boot.
  Mitigation: `_executeRefresh` already verified the token is valid before `AuthProvider` calls `/me`. A 401 from `/me` after a successful refresh would indicate a backend race or revocation — redirecting to sign-in is the correct behavior.

- Risk: JWT decode in `decodeTokenClaims()` fails if the token format changes.
  Mitigation: The function returns `null` on any error, and `AuthProvider` guards with `if (!claims) return` — falls through to `setReady(true)` without setting user. The user will see sign-in, which is safe.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test: open app in browser; if refresh cookie is valid, should land on protected route without sign-in prompt; if no cookie, should see sign-in page

## Review log

- `2026-05-20T14:12:30Z` — Implemented in the managers app, validated with `npm run typecheck` and `npm run build`, then summarized and archived.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
