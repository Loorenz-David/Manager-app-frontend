> Extends: 12_auth.md

# 12 — Auth — ManagerBeyo Managers App Extension

---

## `AuthUser` type override

The canonical `User` type uses `name`, `roles: Role[]`, and `permissions: string[]`. **This backend returns a different shape.** Replace with:

```ts
// src/store/auth.store.ts
type AuthUser = {
  id:                  UserId;
  email:               string;
  username:            string;         // backend field name — not "name"
  role:                string;         // single string — not "roles: Role[]"
  backend_permissions: string[];       // not "permissions"
  ui: {
    apps:          string[];
    pages:         string[];
    buttons:       string[];
    actions:       string[];
    query_filters: string[];
  };
};
```

`WorkspaceId` comes from the JWT claims, not from the profile endpoint.

---

## `decodeTokenClaims()` required for session boot

The profile endpoint `GET /api/v1/users/me` does not return `workspace_id`, `role`, or permissions. These fields are extracted from the JWT payload using `decodeTokenClaims()` (defined in `src/lib/auth-token.ts` — see [04_api_client_local.md](04_api_client_local.md)).

`AuthProvider` must call `decodeTokenClaims()` after a successful `initSession()` to populate the auth store.

---

## `AuthProvider` boot flow override

The canonical boot calls `fetchProfile()` from `features/profile/` and reads `profile.workspace_id`, `profile.roles`, `profile.permissions` directly. **This does not work here** — the profile endpoint has none of those fields.

Replace the canonical boot flow with:

```tsx
// features/auth/components/AuthProvider.tsx — boot flow
useEffect(() => {
  initSession()
    .then(async (ok) => {
      if (!ok) return;

      // workspace_id, role, permissions come from the JWT — not from /users/me
      const claims = decodeTokenClaims();
      if (!claims) return;

      // /api/v1/users/me returns username, email, client_id — nothing else
      const SelfProfileResponseSchema = ApiEnvelopeSchema(
        z.object({
          user: z.object({
            client_id: z.string().transform((v) => v as UserId),
            username:  z.string(),
            email:     z.string(),
          }),
        }),
      );
      const profile = await apiClient.get('/api/v1/users/me', SelfProfileResponseSchema);

      setUser(
        {
          id:                  profile.data.user.client_id,
          email:               profile.data.user.email,
          username:            profile.data.user.username,
          role:                claims.role_name,
          backend_permissions: claims.backend_permissions,
          ui:                  claims.ui,
        },
        claims.workspace_id as WorkspaceId,
      );
    })
    .finally(() => setReady(true));
}, []);
```

Do **not** call `queryClient.setQueryData(profileKeys.detail(), ...)` during boot — there is no profile feature in this app.

---

## Loading fallback override

The canonical uses `<AppBootSkeleton />`. This app uses `<PageSkeleton />` from `@/components/ui/PageSkeleton`:

```tsx
if (!ready) return <PageSkeleton />;
```

---

## Sign-in body — `app_scope` required

The canonical sends `{ email, password }`. **This backend requires an additional field:**

```ts
async function signIn(credentials: { email: string; password: string }) {
  const result = await apiClient.post(
    '/api/v1/auth/sign-in',
    SignInResponseSchema,
    { ...credentials, app_scope: 'admin' },  // required by this backend
  );
  // ...
}
```

---

## Sign-in response schema override

The canonical schema reads fields at the top level. **This backend wraps the response in `ApiEnvelopeSchema`.** The user identifier field is `client_id` (not `id`), and it is a prefixed ULID string (not a UUID).

Replace `SignInResponseSchema` with:

```ts
const SignInResponseSchema = ApiEnvelopeSchema(
  z.object({
    access_token: z.string(),
    user: z.object({
      client_id:           z.string().transform((v) => v as UserId),
      email:               z.string(),
      username:            z.string(),
      role:                z.string(),
      backend_permissions: z.array(z.string()),
      ui: z.object({
        apps:          z.array(z.string()),
        pages:         z.array(z.string()),
        buttons:       z.array(z.string()),
        actions:       z.array(z.string()),
        query_filters: z.array(z.string()),
      }),
    }),
    workspace_id: z.string().transform((v) => v as WorkspaceId),
  }),
);
```

Access the data via `result.data.*`:

```ts
setAccessToken(result.data.access_token);
useAuthStore.getState().setUser(
  {
    id:                  result.data.user.client_id,
    email:               result.data.user.email,
    username:            result.data.user.username,
    role:                result.data.user.role,
    backend_permissions: result.data.user.backend_permissions,
    ui:                  result.data.user.ui,
  },
  result.data.workspace_id,
);
```

---

## Sign-out endpoint override

The canonical calls `POST /api/v1/auth/sign-out`. **This backend uses a different path:**

```ts
// CORRECT for this backend:
await apiClient.post('/api/v1/auth/logout', z.object({}), {});
```

Do **not** call `localStorage.removeItem('app-query-cache')` on sign-out — this app does not use persisted query cache (see [26_persistence.md](26_persistence.md)).

---

## OAuth / SSO — not implemented

This app does not implement OAuth or SSO. The following from the canonical are excluded:

- `features/auth/api/use-oauth-sign-in.ts`
- `features/auth/components/OAuthCallback.tsx`
- Any `/auth/callback` route

Do not build these files.

---

## `AuthProvider` placement

`AuthProvider` must be rendered **inside the router tree** (it calls `useNavigate()`). Mount it inside `RootRoute.tsx` wrapping `<Outlet />`:

```tsx
// src/app/RootRoute.tsx
export function RootRoute() {
  return (
    <SurfaceProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </SurfaceProvider>
  );
}
```

Do **not** place `AuthProvider` in `src/app/providers.tsx` — that component sits above `RouterProvider` and `useNavigate()` is unavailable there.

---

## `ProtectedRoute` — remove DEV bypass

The existing `src/features/auth/components/ProtectedRoute.tsx` has a development bypass that skips auth checks in `import.meta.env.DEV`. Remove it — `AuthProvider` now handles session restoration correctly:

```ts
// BEFORE (wrong):
if (!isAuthenticated && !import.meta.env.DEV) {

// AFTER (correct):
if (!isAuthenticated) {
```
