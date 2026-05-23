# PLAN_fix_auth_cookie_refresh_20260523

## Metadata

- Plan ID: `PLAN_fix_auth_cookie_refresh_20260523`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-23T20:00:00Z`
- Last updated at (UTC): `2026-05-23T19:47:06Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Make the httpOnly refresh-token cookie round-trip correctly in development so that page reload restores the user session without requiring a new login.
- Business/user intent: Currently every page reload logs the user out. The backend already implements a correct httpOnly cookie-based refresh flow; the dev environment's cross-origin configuration silently prevents the cookie from being stored or sent.
- Non-goals: Changing backend auth logic, adding localStorage persistence for the refresh token, modifying production configuration beyond renaming a mismatched env key.

## Root cause

The backend sets the refresh token with:
```python
response.set_cookie("refresh_token", value, httponly=True, secure=True, samesite="lax")
```

In development the frontend (`http://localhost:5173`) fetches the API at a **different origin** (`http://192.168.1.246:8000`). Two browser policies block the cookie:

1. **`SameSite=Lax` + cross-origin POST**: Browsers do not attach `SameSite=Lax` cookies on cross-origin `fetch` POST calls. The `refresh` endpoint never receives the cookie → 403 "Refresh token missing".
2. **`Secure` attribute on HTTP**: Browsers (especially Safari) will not persist a `Secure` cookie unless the response arrived over HTTPS. The sign-in response from `http://192.168.1.246:8000` carries `Secure`, so the cookie is silently dropped on Safari/iPhone.

The fix: configure a **Vite dev-server proxy** so all `/api/…` requests are sent same-origin by the browser (`localhost:5173/api/…`), while Vite forwards them server-side to `192.168.1.246:8000`. The browser sees only `localhost`, so `SameSite=Lax` is satisfied and Chrome/Firefox exempt `localhost` from the `Secure` restriction.

For iPhone/mobile testing, the existing ngrok tunnel (`892a-155-4-95-121.ngrok-free.app`) provides HTTPS, satisfying the `Secure` requirement. No code changes are needed for ngrok — the proxy works identically.

In **production** the API and app share the same root domain over HTTPS, so `SameSite=Lax` + `Secure` already work. The proxy is a dev-only tool and is never active in a production build.

## Scope

- In scope:
  - `vite.config.ts`: add `server.proxy` forwarding `/api` to the API origin; use Vite's `loadEnv` to read the target from a non-prefixed env var `API_TARGET_URL`.
  - `.env`: replace `VITE_API_URL=http://192.168.1.246:8000` with `API_TARGET_URL=http://192.168.1.246:8000` (proxy target, server-side only) and `VITE_API_URL=` (empty — frontend uses relative URLs in dev).
  - `.env.production`: rename `VITE_API_BASE_URL` → `VITE_API_URL` to align with the key the frontend code actually reads.
  - `src/lib/env.ts`: relax `VITE_API_URL` schema from `z.string().url()` to `z.string()` so an empty string is valid.
  - `src/lib/api-client.ts` (`buildUrl`): fall back to `window.location.origin` when `VITE_API_URL` is empty, so `new URL(path, base)` always receives a valid base.
  - `src/lib/auth-token.ts` (`_executeRefresh`): apply the same empty-string fallback for the inline refresh fetch.
- Out of scope:
  - Backend cookie settings.
  - WebSocket / `VITE_WS_BASE_URL` (production-only, not related).
  - `VITE_PLAYWRIGHT_*` env vars.
- Assumptions:
  - The Vite dev server is always used for local development (not a separate build-and-serve step).
  - `API_TARGET_URL` (no `VITE_` prefix) is intentionally server-side — it is never exposed to the browser bundle.

## Clarifications required

_(none — root cause is confirmed, fix is mechanical)_

## Acceptance criteria

1. After signing in, reloading the page keeps the user authenticated (no redirect to sign-in, no 403 on `/api/v1/auth/refresh`).
2. `npm run typecheck` passes with zero errors after the changes.
3. The Vite proxy forwards API requests correctly: `GET http://localhost:5173/api/v1/tasks` → backend at `API_TARGET_URL`.
4. Production env (`VITE_API_URL=https://…`) still passes `env.ts` validation (non-empty string is a valid `z.string()`).

## Contracts and skills

### Contracts loaded

- `docs/architecture/backend/tables/client_id_prefix_map.md`: not applicable for this plan.

### Skill selection

- Primary skill: `—` (infrastructure / config change, no feature skill applies)

## Implementation plan

### Step 1 — `vite.config.ts`: add dev proxy

Change the export to use the function form so `loadEnv` can read `API_TARGET_URL` from the `.env` file. Add `server.proxy`:

```ts
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // '' prefix = load ALL vars

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['892a-155-4-95-121.ngrok-free.app'],
      proxy: {
        '/api': {
          target: env.API_TARGET_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
```

`changeOrigin: true` rewrites the `Host` header to match the target, which is required for CORS on the backend.

---

### Step 2 — `.env` ⚠️ LOCAL DEV ONLY

> **Deployment note:** `.env` is the local development file. It is `.gitignore`d and never deployed. Changes here have zero effect on staging or production. When you set up a new machine, copy `.env` and adjust the IP to match your local backend.

This file currently has one key doing two jobs: it is the API base URL used by the browser AND the proxy target used by Vite. After this change they are split into two separate keys:

| Key | Who reads it | Purpose |
|---|---|---|
| `API_TARGET_URL` | `vite.config.ts` at server startup | Tells the Vite proxy where to forward `/api/…` requests. **Never sent to the browser.** |
| `VITE_API_URL` | Browser bundle (`src/lib/env.ts`) | Base URL for all API calls. Empty in dev — the browser sends relative URLs, Vite proxy catches them. |

Replace:
```
VITE_API_URL=http://192.168.1.246:8000
```
With:
```
# ── Vite dev-server proxy target (server-side only, never in the browser bundle) ──
# Point this at your local backend. Change the IP if your machine's address differs.
API_TARGET_URL=http://192.168.1.246:8000

# ── Frontend API base URL ──
# Empty in dev: browser sends relative /api/… paths, Vite proxy handles routing.
# In production this would be the full API origin (see .env.production).
VITE_API_URL=
```

The `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` lines are unchanged.

---

### Step 3 — `.env.production` ⚠️ PRODUCTION DEPLOYMENT

> **Deployment note:** `.env.production` is the template you use to configure the deployed build. Every key here maps directly to an environment variable that must be injected in your hosting environment (CI/CD, Docker, hosting platform). If you rename a key here you must rename it in the hosting config too.

This step is a **key rename only** — no value changes, no new keys. The codebase reads `VITE_API_URL` but the production file currently has `VITE_API_BASE_URL`. This mismatch means `env.ts` validation would fail in a production build. Fix:

Replace:
```
VITE_API_BASE_URL=https://api-manager.beyoworkaroundtheclock.com
```
With:
```
# Full API origin used by the browser in production. No Vite proxy is active in production builds.
VITE_API_URL=https://api-manager.beyoworkaroundtheclock.com
```

`VITE_WS_BASE_URL` is unchanged.

> When updating your hosting environment (CI secret, Docker env, platform dashboard), rename the injected variable from `VITE_API_BASE_URL` to `VITE_API_URL`.

---

### Step 4 — `src/lib/env.ts`: allow empty string

Change the schema so `VITE_API_URL=''` passes validation:

```ts
const EnvSchema = z.object({
  VITE_API_URL: z.string(), // empty string = dev proxy mode; full URL = production
});
```

---

### Step 5 — `src/lib/api-client.ts`: safe base URL in `buildUrl`

Current `buildUrl` passes `env.VITE_API_URL` directly as the base to `new URL()`. An empty string is not a valid URL base and will throw.

Change `buildUrl` to:

```ts
function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const base = env.VITE_API_URL || window.location.origin;
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}
```

No other changes to `api-client.ts`.

---

### Step 6 — `src/lib/auth-token.ts`: same fallback for the inline refresh fetch

The `_executeRefresh` function builds its URL directly from `env.VITE_API_URL`:

```ts
// current (breaks when VITE_API_URL is empty)
const response = await fetch(`${env.VITE_API_URL}/api/v1/auth/refresh`, { ... });
```

Change to:

```ts
const base = env.VITE_API_URL || window.location.origin;
const response = await fetch(`${base}/api/v1/auth/refresh`, {
  method: 'POST',
  credentials: 'include',
});
```

---

### Step 7 — `src/vite-env.d.ts`: no change required

`VITE_API_URL: string` is already typed as `string` and continues to be correct.

## Risks and mitigations

- Risk: `API_TARGET_URL` missing from `.env` causes the proxy `target` to be `undefined`, silently breaking all API calls.
  Mitigation: Vite will log a proxy error on the first request. Developer sees it immediately. Document the required key in `.env.example` or in the README.

- Risk: `.env.production` rename (`VITE_API_BASE_URL` → `VITE_API_URL`) could break a deployed build if there is a CI/CD pipeline that injects the old key name.
  Mitigation: Codex must grep for `VITE_API_BASE_URL` across CI config files and update any reference found. If any are found, update them; if none are found, the rename is safe.

- Risk: `window.location.origin` fallback is not available in SSR or test environments.
  Mitigation: This codebase is a pure SPA with no SSR. Jest/Vitest environments mock `window` by default; if a test calls `buildUrl` without setting `VITE_API_URL`, it will use `http://localhost` (jsdom default) which is the correct test baseline.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Manual: sign in → reload page → user remains authenticated, no redirect to `/sign-in`, no 403 on `/api/v1/auth/refresh`.
- Manual: verify Vite dev-server logs show proxy forwarding (e.g. `[vite] http proxy GET /api/v1/tasks -> http://192.168.1.246:8000`).
- Manual: sign-in response in DevTools Application → Cookies → `localhost` shows `refresh_token` httpOnly cookie set.

## Review log

- `2026-05-23` `copilot`: plan authored
- `2026-05-23` `Codex`: implemented the Vite proxy, env-key alignment, and empty-base API fallback; `npm run typecheck` passed

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
