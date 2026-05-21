> Extends: 34_runtime_validation.md

# 34 — Runtime Validation — ManagerBeyo Managers App Extension

---

## Bootstrap status

The Playwright testing infrastructure is fully bootstrapped. Do not recreate any file listed below — they already exist.

---

## Fixture and helper paths

```
tests/playwright/
  fixtures/
    app-fixture.ts          ← base test: console error interception + auth fixture wired
    auth-fixture.ts         ← AuthHelper class with signIn() method
  helpers/
    assert-drawer.ts        ← assertDrawerOpen, assertDrawerDismissedByGesture
    assert-modal.ts         ← assertModalOpen, assertModalClosedByBackdrop, assertModalClosedByEscape
    assert-optimistic.ts    ← withDelayedRoute (delays a request to expose optimistic state)
    assert-network.ts       ← waitForApiRequest, assertNoUnexpectedErrors
  features/
    auth/
      sign-in.spec.ts       ← reference spec: sign-in flow
```

All specs import `test` and `expect` from `../../fixtures/app-fixture` — never from `@playwright/test` directly. This ensures console error interception runs on every test.

---

## Auth fixture — real backend

`AuthHelper.signIn()` navigates to `/sign-in`, fills in credentials via `data-testid`, submits, and waits for `waitForURL('/')`.

```ts
// Usage in a spec:
import { test, expect } from '../../fixtures/app-fixture';

test('my authenticated test', async ({ page, auth }) => {
  await auth.signIn();  // navigates to / on success
  // ... test continues
});
```

Credentials come from environment variables:

```
PLAYWRIGHT_TEST_EMAIL=your@email.com
PLAYWRIGHT_TEST_PASSWORD=yourpassword
```

Set these in a `.env.test` file or export them in the shell before running. Tests that call `auth.signIn()` without these set will either fail or navigate to an error state — guard them with `test.skip(!hasCredentials, '...')` if the test can optionally run without a real session.

---

## npm scripts

```
npm run test:e2e            ← both projects (mobile + desktop)
npm run test:e2e:mobile     ← mobile project only (run this first — mobile is the primary target)
npm run test:e2e:desktop    ← desktop project only
```

Run mobile first. If mobile fails, fix before running desktop.

---

## Project names

| Contract name | Config value | Viewport |
|---|---|---|
| `mobile` | `iPhone 14 Pro` device preset | 390×844, touch events, mobile UA |
| `desktop` | `1440×900` viewport | desktop UA |

Always reference `--project=mobile` and `--project=desktop` in plan steps. The old names `mobile-chrome` / `desktop-chrome` no longer exist.

---

## Spec file location convention

```
tests/playwright/features/<feature-name>/<flow-name>.spec.ts
```

| Feature | Flow | File |
|---|---|---|
| auth | sign-in | `features/auth/sign-in.spec.ts` |
| tasks | create task | `features/tasks/create-task.spec.ts` |
| tasks | task detail | `features/tasks/task-detail.spec.ts` |

One spec file per cohesive flow. A spec covers what Vitest cannot: real DOM rendering, network requests, optimistic state timing, drawer/modal gestures, responsive layout.

---

## `data-testid` naming — sign-in reference

The first set of `data-testid` attributes follows the `[feature]-[element-type]-[context?]` convention defined in `34_runtime_validation.md`. Already implemented:

| Element | `data-testid` |
|---|---|
| Sign-in email input | `auth-email-input` |
| Sign-in password input | `auth-password-input` |
| Sign-in submit button | `auth-sign-in-button` |
| Sign-in root error container | `auth-error-root` |

Use these as the naming pattern reference for all future features.

---

## Mocking vs real backend

Most spec assertions use `page.route()` to mock API responses. This keeps tests deterministic and removes the real backend dependency.

**Exception**: tests that exercise the full auth flow end-to-end (sign-in redirects to `/`) should use the real backend and guard with `test.skip(!hasCredentials, '...')`.

**Pattern for mocked error tests**:

```ts
await page.route('**/api/v1/<endpoint>', (route) =>
  route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Human-readable message.', ok: false }),
  }),
);
```

The error body shape `{ error: string, ok: false }` matches this backend's flat error envelope (see `04_api_client_local.md`).

---

## Console error interception

The base fixture in `app-fixture.ts` automatically fails any test that produces a `console.error` or uncaught exception (`pageerror`).

### Filtered messages

| Pattern | Reason |
|---|---|
| `[HMR] Cannot apply update` | Vite HMR noise in dev mode |
| `Failed to load resource` | Chromium logs every non-2xx `fetch()` response at the browser level — including expected 401/403/429 error-path responses. Real application errors (React failures, uncaught exceptions) never produce this message and are caught via `pageerror` instead. |

Do not add broad filters beyond these. Every suppressed message must be explicitly justified. If a new filter is needed, add it inside `app-fixture.ts` with a comment explaining why.
