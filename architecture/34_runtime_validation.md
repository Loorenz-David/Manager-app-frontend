# 34 — Runtime Validation Contract

## Definition

Runtime validation is the mandatory browser-level verification pass that confirms a feature behaves correctly under real conditions: real DOM rendering, real network responses, real animation sequences, real gesture interactions, and real asynchronous state transitions. It is not a quality-of-life addition. It is a required completion gate.

Runtime validation uses Playwright as its execution environment. Playwright is positioned in this architecture as **runtime observability infrastructure**, **implementation verification infrastructure**, **browser validation infrastructure**, and **AI feedback loop infrastructure** — not merely a UI testing tool.

An implementation is not complete until runtime validation passes.

---

## The two validation layers

Two distinct validation layers are mandatory. Neither substitutes for the other.

| Layer | Tool | Scope | When |
|---|---|---|---|
| Logic + component | Vitest + RTL + MSW | Hooks, mutations, components in isolation | During and after implementation |
| Runtime | Playwright | Full browser: DOM, network, animations, gestures, async state, realtime | After implementation, before completion |

The Vitest layer validates that logic and component behavior are correct in isolation. It cannot validate that drawers open with the correct gesture, that optimistic updates render before the network response, that socket events produce DOM changes, that the correct requests are sent, or that no console errors occur. Playwright validates all of these.

Passing Vitest is necessary. It is not sufficient.

---

## Playwright as infrastructure

Playwright is the browser runtime environment where implementation correctness is confirmed. Its role in this architecture:

| Role | What Playwright provides |
|---|---|
| Runtime observability | Console output, network traffic, page errors, uncaught exceptions |
| Implementation verification | Confirms that features behave correctly end-to-end in the real browser |
| Browser validation | DOM state, rendering, layout, responsive behavior at real viewports |
| AI feedback loop | Structured runtime output that agents inspect, iterate on, and confirm |

Playwright does not test implementation details. It validates visible behavior: what the user sees, what the browser renders, what network requests are made, and what errors appear.

---

## Implementation completion criteria

An implementation is complete only when both validation layers pass. The runtime validation completion checklist:

- [ ] No console errors during any part of the feature flow
- [ ] No uncaught exceptions
- [ ] All required interaction flows complete successfully
- [ ] Network requests match expected URL patterns, methods, and payloads
- [ ] No unexpected HTTP 4xx or 5xx responses during happy-path flows
- [ ] Responsive layout validates at mobile viewport (390×844) and desktop viewport (1440×900)
- [ ] Drawer open, close, and gesture-dismiss behavior succeeds on mobile viewport
- [ ] Modal open, close, and backdrop-dismiss behavior succeeds
- [ ] Optimistic updates render immediately before the network response arrives
- [ ] Optimistic rollback restores the previous state on mutation failure
- [ ] Socket events produce correct DOM updates within the expected timeout
- [ ] All `data-testid` targets are present and reachable in the rendered DOM
- [ ] Playwright trace captures the complete feature flow without errors

A failed runtime validation is a failed implementation — not a known issue to resolve later.

---

## Deterministic selector strategy

All feature-critical interactive elements must expose a stable `data-testid` attribute.

`data-testid` is the required selector strategy for runtime validation. Class names, text content, placeholder text, and element structure are fragile — they change with styling and copy updates. `data-testid` attributes are stable, explicit contracts between the implementation and the runtime validator.

Playwright tests never select elements by:
- CSS class names (`.btn`, `.invoice-row`)
- Element type alone (`button`, `div`, `span`)
- Text content that may change or be translated
- DOM nesting structure (`nth-child`, `first-child`)

Playwright tests use `data-testid` for all feature-critical targets.

---

## `data-testid` naming convention

```
data-testid="[feature]-[element-type]-[context?]"
```

The naming is hierarchical: feature, then element role, then optional context for disambiguation. The third segment is added only when two elements in the same feature would otherwise share an identical selector.

| Element | `data-testid` |
|---|---|
| Invoice list container | `invoice-list` |
| Invoice list row | `invoice-list-row` |
| Create invoice button | `invoice-create-button` |
| Invoice detail drawer | `invoice-detail-drawer` |
| Invoice form submit | `invoice-form-submit` |
| Invoice status filter | `invoice-status-filter` |
| Invoice delete confirm modal | `invoice-delete-confirm-modal` |
| Invoice delete confirm button | `invoice-delete-confirm-button` |
| Connection status indicator | `socket-connection-status` |
| Notification toast | `notification-toast` |
| Auth email input | `auth-email-input` |
| Auth sign-in button | `auth-sign-in-button` |

---

## Feature-critical element requirements

The following element categories must expose `data-testid` in every feature:

- Primary action buttons — create, submit, confirm, delete, save
- List and table rows that represent an entity
- Filter controls — status filter, date filter, search input
- Sort controls
- Drawer containers opened by the feature
- Modal containers opened by the feature
- Form fields targeted in runtime validation flows
- Status indicators — connection status, empty states, error states, loading states
- Pagination controls

Secondary display-only elements (decorative icons, static labels) do not require `data-testid` unless a runtime validation scenario explicitly targets them.

---

## Network validation

Runtime validation asserts on network behavior, not only DOM behavior.

Use `page.waitForRequest()` and `page.route()` to intercept and assert on requests:

```ts
// tests/playwright/features/invoices/create-invoice.spec.ts
import { test, expect } from '../../fixtures/app-fixture';

test('creates invoice and opens detail surface', async ({ page, auth }) => {
  await auth.signIn();
  await page.goto('/invoices');

  const createRequest = page.waitForRequest(
    (req) => req.url().includes('/api/v1/invoices') && req.method() === 'POST',
  );

  await page.getByTestId('invoice-create-button').click();
  await page.getByTestId('invoice-form-due-date').fill('2026-12-31');
  await page.getByTestId('invoice-form-submit').click();

  const req = await createRequest;
  expect(req.postDataJSON()).toMatchObject({ due_date: expect.any(String) });

  await expect(page).toHaveURL(/\/invoices\/[\w-]+/);
  await expect(page.getByTestId('invoice-detail-drawer')).toBeVisible();
});
```

Network validation requirements:
- Assert that the correct HTTP method is used
- Assert that request bodies contain required fields
- Assert on the URL pattern (not exact URL — IDs change per test run)
- Assert on response status when testing error paths
- Assert that no unexpected 4xx/5xx responses occur during happy-path flows

---

## Realtime synchronization validation

Socket-driven state changes must produce visible DOM updates within a deterministic timeout. Runtime validation confirms the full chain: socket event → cache invalidation → refetch → DOM update.

```ts
// tests/playwright/features/invoices/invoice-realtime.spec.ts
import { test, expect } from '../../fixtures/app-fixture';
import { triggerSocketEvent } from '../../helpers/socket-trigger';

test('invoice row updates when socket event arrives', async ({ page, auth }) => {
  await auth.signIn();
  await page.goto('/invoices');

  const row = page.getByTestId('invoice-list-row').first();
  await expect(row).toContainText('Draft');

  await triggerSocketEvent(page, 'invoice:updated', { id: 'TEST_INVOICE_ID' });

  // Assert DOM updates within the expected reconciliation window — do not use waitForTimeout
  await expect(row).toContainText('Paid', { timeout: 5000 });
});
```

Realtime validation requirements:
- Trigger socket events programmatically or via a backend test endpoint
- Assert that the DOM updates within a meaningful timeout — never a fixed `waitForTimeout`
- Confirm the connection status indicator reflects connected state before triggering events
- Validate that batch socket events produce correct multi-row DOM updates
- Validate reconnection: close the socket, reconnect, confirm active queries refetch

---

## Surface validation — drawers, modals, overlays

Drawer and modal behavior is a first-class runtime validation target. Surfaces are not considered working until their open, close, and gesture behavior passes at real viewport sizes.

### Drawer validation (mobile viewport — 390×844)

```ts
// tests/playwright/features/invoices/invoice-detail.spec.ts
import { test, expect } from '../../fixtures/app-fixture';
import { assertDrawerDismissedByGesture } from '../../helpers/assert-drawer';

test('invoice detail drawer opens and dismisses via gesture', async ({ page, auth }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await auth.signIn();
  await page.goto('/invoices');

  await page.getByTestId('invoice-list-row').first().click();
  await expect(page.getByTestId('invoice-detail-drawer')).toBeVisible();

  await assertDrawerDismissedByGesture(page, 'invoice-detail-drawer');
  await expect(page.getByTestId('invoice-detail-drawer')).not.toBeVisible();
});
```

### Modal validation

```ts
test('delete confirm modal closes on backdrop click', async ({ page, auth }) => {
  await auth.signIn();
  await page.goto('/invoices');

  await page.getByTestId('invoice-list-row').first().click();
  await page.getByTestId('invoice-delete-button').click();

  const modal = page.getByTestId('invoice-delete-confirm-modal');
  await expect(modal).toBeVisible();

  // Click backdrop — outside modal bounds
  await page.mouse.click(10, 10);
  await expect(modal).not.toBeVisible();
});
```

Surface validation requirements:
- Assert that the surface is visible after the trigger
- Assert that the surface contains expected content after data loads
- Assert that the close button closes the surface
- Assert that backdrop click closes modals
- Assert that drag gesture dismisses drawers on mobile viewport
- Assert that `Escape` key closes modals
- Assert that stacked surfaces maintain correct z-order
- Assert that the URL changes correctly for URI-enabled surfaces (see `28_surfaces.md`)

---

## Optimistic update validation

Optimistic updates must be visible before the network response arrives. Runtime validation uses request interception to delay responses and confirm the optimistic state renders immediately.

```ts
// tests/playwright/features/invoices/invoice-optimistic.spec.ts
import { test, expect } from '../../fixtures/app-fixture';

test('status updates optimistically before server confirms', async ({ page, auth }) => {
  await auth.signIn();
  await page.goto('/invoices');

  // Delay the PATCH response to observe the optimistic state window
  let resolveDelay!: () => void;
  await page.route('**/api/v1/invoices/**', async (route) => {
    if (route.request().method() === 'PATCH') {
      await new Promise<void>((resolve) => { resolveDelay = resolve; });
    }
    await route.continue();
  });

  await page.getByTestId('invoice-list-row').first().click();
  await page.getByTestId('invoice-mark-paid-button').click();

  // Optimistic state must be visible before the response resolves
  const row = page.getByTestId('invoice-list-row').first();
  await expect(row).toContainText('Paid');

  // Resolve the network response — confirmed state must persist
  resolveDelay();
  await expect(row).toContainText('Paid');
});

test('status rolls back on mutation failure', async ({ page, auth }) => {
  await auth.signIn();
  await page.goto('/invoices');

  // Force a 500 on the PATCH
  await page.route('**/api/v1/invoices/**', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: { code: 'server_error', message: 'Oops' } }),
      });
    } else {
      await route.continue();
    }
  });

  const row = page.getByTestId('invoice-list-row').first();
  const originalText = await row.textContent();

  await row.click();
  await page.getByTestId('invoice-mark-paid-button').click();

  // Rollback must restore the original state
  await expect(row).toContainText(originalText!.trim());
});
```

---

## Mobile-first runtime testing

All Playwright tests validate mobile viewport as the primary target. Desktop is validated additionally. Not the other way around.

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:       './tests/playwright',
  fullyParallel: true,
  retries:       process.env.CI ? 2 : 0,
  reporter:      [['html'], ['line']],

  use: {
    baseURL:    process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 14 Pro'] },   // 390×844, touch events, mobile UA
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    command:              'npm run dev',
    url:                  'http://localhost:5173',
    reuseExistingServer:  !process.env.CI,
  },
});
```

Mobile-specific runtime requirements:
- Drawer `direction` is `bottom` on mobile viewport — validate bottom-entry animation
- Drag handle renders on mobile — assert it is visible
- Touch gestures produce dismiss — validate drag behavior
- Tap targets meet 44×44 px minimum — assert via `boundingBox()`
- No horizontal overflow at 390 px width — assert by checking `document.documentElement.scrollWidth`
- Bottom navigation (if present) is reachable above virtual keyboard height

---

## Test organization

```
tests/
  playwright/
    fixtures/
      app-fixture.ts        ← base test fixture: page, auth, error interception
      auth-fixture.ts       ← authenticated session setup
      socket-fixture.ts     ← socket event trigger helpers
    helpers/
      navigate-to.ts        ← page navigation helpers
      wait-for-query.ts     ← wait for TanStack Query to settle
      assert-drawer.ts      ← drawer open / close / gesture assertions
      assert-modal.ts       ← modal open / close / backdrop assertions
      assert-optimistic.ts  ← optimistic update + rollback helpers
      assert-realtime.ts    ← socket event → DOM update assertion helpers
      assert-network.ts     ← request / response assertion helpers
      socket-trigger.ts     ← programmatic socket event dispatch
    runtime/
      console-errors.spec.ts  ← global: no console errors on any route
      page-errors.spec.ts     ← global: no uncaught exceptions on any route
    features/
      invoices/
        create-invoice.spec.ts
        invoice-detail.spec.ts
        invoice-filters.spec.ts
        invoice-realtime.spec.ts
        invoice-optimistic.spec.ts
      auth/
        sign-in.spec.ts
        session-expiry.spec.ts
```

### File naming convention

```
<feature>-<flow>.spec.ts

create-invoice.spec.ts        ← full create interaction flow
invoice-detail.spec.ts        ← detail surface: open, close, content
invoice-filters.spec.ts       ← filter interaction and result rendering
invoice-realtime.spec.ts      ← socket events → DOM update chain
invoice-optimistic.spec.ts    ← optimistic updates + rollback behavior
```

Each spec file validates one cohesive flow. A spec file for a feature is not an exhaustive test suite — it validates the specific behaviors that the Vitest layer cannot validate.

---

## Required Playwright fixtures and helpers architecture

### Base fixture — error interception wired globally

```ts
// tests/playwright/fixtures/app-fixture.ts
import { test as base, expect } from '@playwright/test';
import { AuthHelper } from './auth-fixture';

type AppFixtures = {
  auth: AuthHelper;
};

export const test = base.extend<AppFixtures>({
  page: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    await use(page);

    // Fail the test if any errors were collected — errors are contract violations
    expect(errors, 'Console errors or uncaught exceptions occurred').toEqual([]);
  },

  auth: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },
});

export { expect };
```

### Auth fixture

```ts
// tests/playwright/fixtures/auth-fixture.ts
import type { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(email = 'test@example.com', password = 'test-password') {
    await this.page.goto('/sign-in');
    await this.page.getByTestId('auth-email-input').fill(email);
    await this.page.getByTestId('auth-password-input').fill(password);
    await this.page.getByTestId('auth-sign-in-button').click();
    await this.page.waitForURL(/\/dashboard/);
  }
}
```

### Drawer helper

```ts
// tests/playwright/helpers/assert-drawer.ts
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function assertDrawerOpen(page: Page, testId: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
}

export async function assertDrawerDismissedByGesture(page: Page, testId: string) {
  const drawer = page.getByTestId(testId);
  const box    = await drawer.boundingBox();

  if (!box) throw new Error(`Drawer "${testId}" not found or not visible`);

  // Simulate downward drag from near the top of the drawer
  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 400, { steps: 20 });
  await page.mouse.up();

  await expect(drawer).not.toBeVisible({ timeout: 1000 });
}
```

### Optimistic helper

```ts
// tests/playwright/helpers/assert-optimistic.ts
import type { Page } from '@playwright/test';

export async function withDelayedRoute(
  page:     Page,
  pattern:  string,
  method:   string,
  callback: () => Promise<void>,
): Promise<{ resolve: () => void }> {
  let resolveDelay!: () => void;

  await page.route(pattern, async (route) => {
    if (route.request().method() === method) {
      await new Promise<void>((resolve) => { resolveDelay = resolve; });
    }
    await route.continue();
  });

  await callback();
  return { resolve: resolveDelay };
}
```

---

## Trace, video, and screenshot expectations

Trace artifacts are the primary debugging resource after a runtime validation failure. The Playwright trace viewer shows every action, every DOM snapshot, every network request, and every console message in the exact sequence they occurred. It is the browser session recording for a failed scenario.

| Artifact | Configuration | Purpose |
|---|---|---|
| Trace | `on-first-retry` | Captures full session on the retry after first failure — always available post-failure |
| Screenshot | `only-on-failure` | DOM snapshot at the moment of assertion failure |
| Video | `retain-on-failure` | Full interaction recording for visual inspection of gesture and animation failures |

Never disable trace capture. Without traces, failed CI runs produce no diagnostic output. The `on-first-retry` setting balances coverage and performance: traces are not captured on passing runs, but any run that becomes a failure after a retry has a trace.

---

## Console error protocol

Console errors during a Playwright run are treated as test failures, not incidental output. The base fixture (above) intercepts `console.error` and `pageerror` events automatically and fails the test if any are collected.

Known intentional console outputs — dev-only library warnings, expected error boundary messages — must be explicitly filtered:

```ts
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    // Suppress known intentional errors — all others fail the test
    const known = ['[HMR] Cannot apply update'];
    if (!known.some((k) => msg.text().includes(k))) {
      errors.push(`[console.error] ${msg.text()}`);
    }
  }
});
```

The filter list must be minimal. Every entry must be justified. Never add a broad filter to silence unknown errors.

---

## AI agent runtime validation workflow

Agents must validate features with Playwright after implementation. Static type checking and Vitest tests are not sufficient to call an implementation complete.

### Required steps after feature implementation

1. Add `data-testid` attributes to all feature-critical interactive elements.
2. Write the Playwright runtime validation spec for the feature.
3. Start the dev server (`npm run dev` if not already running).
4. Run the runtime validation spec against the mobile project first.
5. Inspect the results:
   - Browser console output — flag any `console.error` or unexpected warnings
   - Failed network requests — assert on status codes and error bodies
   - Page errors — report any uncaught exceptions
   - DOM state — confirm expected elements are visible and correctly populated
   - Responsive behavior — confirm layout at 390×844, no horizontal overflow
6. If validation fails: diagnose the root cause, fix the implementation, re-run.
7. Iterate until the spec passes on both `mobile` and `desktop` projects.
8. The implementation is complete only when runtime validation passes.

### Agent inspection protocol

After running Playwright, agents must inspect:

| Inspection target | Method |
|---|---|
| Console errors | Base fixture error array + trace viewer console tab |
| Failed network requests | `page.on('response', ...)` for 4xx/5xx, or trace network tab |
| Uncaught exceptions | Base fixture pageerror array |
| Drawer behavior | Screenshot at open state; gesture dismiss assertion |
| Responsive layout | Run at 390×844 viewport; assert `scrollWidth === clientWidth` |
| Realtime updates | Assert DOM state before and after `triggerSocketEvent` |
| Optimistic behavior | Use `withDelayedRoute` helper to observe pre-response state |

Agents do not report "implementation complete" if any console error, uncaught exception, or failed network request occurred during the runtime validation run.

---

## Runtime validation build lifecycle

Runtime validation is the final gate in the feature build lifecycle defined in `16_feature_workflow.md`:

```
Types → Query Keys → API Functions + Query Hooks → Actions → Controllers
  → Flows → Providers → Components → Forms → Pages
  → Dynamic loading → Routes → Public API (index.ts)
  → Unit + component tests  (Vitest)
  → data-testid attributes  (feature-critical elements)
  → Runtime validation spec (Playwright)
  → Runtime validation pass (mobile + desktop)
  → COMPLETE
```

Runtime validation is never deferred. It is not an optional enhancement added after feature delivery. It is a required completion gate with the same weight as TypeScript compilation passing.

---

## What runtime validation must NOT do

- **Never call an implementation complete without runtime validation passing.** TypeScript compilation and Vitest passing are necessary — they are not sufficient.
- **Never select elements by class name, text content alone, or DOM nesting in Playwright tests.** Use `data-testid` for all feature-critical targets.
- **Never use `page.waitForTimeout(N)` as a synchronization primitive.** Use `page.waitForSelector()`, `page.waitForResponse()`, `page.waitForURL()`, or `page.waitForLoadState()`. Fixed delays make tests flaky and hide real timing issues.
- **Never ignore console errors in the Playwright output.** They are contract violations — a component failed to render, a hook threw, a query silently failed.
- **Never validate only the happy path.** Runtime validation must include the error path, the empty state, and the optimistic rollback path for any feature that performs mutations.
- **Never run runtime validation only on desktop.** Mobile viewport is the primary target. Desktop is the additional validation.
- **Never test implementation details** (store state values, hook return shapes, internal component state). Test what the user sees in the browser.
- **Never write the runtime validation spec after the feature ships.** It is part of the feature build order, written and passing before the feature is considered complete.
- **Never disable trace capture in CI.** `trace: 'on-first-retry'` must remain enabled. Disabling it eliminates all diagnostic output for failed runs.
- **Never add a broad console error filter.** Every suppressed error must be explicitly justified. Silencing unknown errors hides real implementation bugs.
- **Never add `data-testid` only to entry-point triggers.** Add them to all elements runtime validation scenarios need to reach — including the containers, form fields, and status indicators inside the feature.
