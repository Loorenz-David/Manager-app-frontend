> Extends: 04_api_client.md

# 04 — API Client — ManagerBeyo Managers App Extension

---

## Backend error shape override

The canonical contract describes a structured error object with `code`, `message`, and `field_errors` fields. **This backend does not match that shape.** The actual error envelope is:

```json
{ "error": "Human-readable message string", "ok": false }
```

No `code` field. No `field_errors`. The error is a flat string.

### `ApiErrorSchema` replacement

Replace the canonical `ApiErrorSchema` in `src/types/api.ts` with:

```ts
// Backend error shape: { "error": "message string", "ok": false }
// No code field. No field_errors. Code is derived from HTTP status by the frontend.
export const ApiErrorSchema = z.object({
  error: z.string(),
  ok: z.literal(false),
});
```

### `codeFromStatus` helper (added in `src/lib/api-client.ts`)

Since the backend provides no error code, derive one from the HTTP status:

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

### `handleErrorResponse` replacement

Because the backend error has no `code` or `field_errors`, `handleErrorResponse` must use `codeFromStatus`:

```ts
async function handleErrorResponse(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(response.status, codeFromStatus(response.status), response.statusText);
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      parsed.data.error,           // flat string — no nesting
    );
  }

  throw new ApiRequestError(response.status, 'unknown_error', 'An unexpected error occurred.');
}
```

### `ApiRequestError` — no `fieldErrors` parameter

This backend has no field-level error payload. Drop the optional `fieldErrors` parameter from `ApiRequestError`:

```ts
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
```

---

## Refresh response envelope override

The canonical contract reads `data.access_token` directly from the raw response body:

```ts
// CANONICAL (wrong for this backend):
const data = await response.json() as { access_token: string };
setAccessToken(data.access_token);
```

**This backend wraps the refresh response in a `build_ok` envelope.** The actual shape is:

```json
{ "ok": true, "data": { "access_token": "..." }, "warnings": [] }
```

Read `body.data.access_token` instead:

```ts
// CORRECT for this backend:
const body = await response.json() as {
  ok: boolean;
  data: { access_token: string };
  warnings: string[];
};
setAccessToken(body.data.access_token);
```

This applies only inside `_executeRefresh()` in `src/lib/auth-token.ts`. The `apiClient` wrapper is **not** used for the refresh call (it would create a circular dependency).

---

## `decodeTokenClaims()` — additional export in `auth-token.ts`

The canonical contract does not include this function. This app needs it because `GET /api/v1/users/me` does not return `workspace_id`, `role`, or permissions — those fields are only available in the JWT payload.

Add to `src/lib/auth-token.ts`:

```ts
type TokenClaims = {
  user_id:             string;
  username:            string;
  workspace_id:        string;
  role_name:           string;
  backend_permissions: string[];
  ui:                  string[];
};

export function decodeTokenClaims(): TokenClaims | null {
  if (!_accessToken) return null;
  try {
    const payload = _accessToken.split('.')[1];
    return JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    ) as TokenClaims;
  } catch {
    return null;
  }
}
```

This is a client-side base64 decode only — no signature verification. The backend verifies the JWT on every request. `decodeTokenClaims()` is used exclusively during session boot inside `AuthProvider` to populate the auth store.

---

## Error codes table override

The canonical error codes table lists `validation_failed` for 400 with `field_errors`. Replace:

| HTTP status | `code` | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed request — no field-level errors returned |
| 401 | `unauthorized` | Token expired — handled internally by the refresh cycle |
| 403 | `forbidden` | Authenticated but not authorised |
| 404 | `not_found` | Entity does not exist |
| 409 | `conflict` | Optimistic concurrency or uniqueness violation |
| 422 | `unprocessable` | Backend domain error (business rule) |
| 500 | `server_error` | Unhandled backend exception |
| 502/503 | `network_error` | Gateway unavailable |

Callers branch on `error.code`. No caller should attempt to read `error.fieldErrors` — this backend has no such payload.

## Rate-limit error shape (FastAPI HTTPException)

The `/api/v1/auth/sign-in` endpoint (and potentially others) can return a 429 via a
FastAPI `HTTPException` raised by the rate-limit middleware. This has a different body
shape from the standard service error:

```json
{ "detail": "Rate limit exceeded. Please wait before retrying." }
```

`handleErrorResponse` in `api-client.ts` tries `ApiErrorSchema` first, then
`RateLimitErrorSchema ({ detail: z.string() })` as a fallback. Callers receive an
`ApiRequestError` with `code: 'rate_limited'` and `message` set to the detail string.

Add `429 → 'rate_limited'` to the error codes table.
