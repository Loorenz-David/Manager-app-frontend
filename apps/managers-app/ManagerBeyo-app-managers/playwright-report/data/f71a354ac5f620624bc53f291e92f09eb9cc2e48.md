# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features/task_creation/task-creation-form-flow.spec.ts >> Task creation staged forms >> pre-order form advances past customer step when all visible required fields are filled
- Location: tests/playwright/features/task_creation/task-creation-form-flow.spec.ts:48:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: Console errors or uncaught exceptions occurred

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 18

- Array []
+ Array [
+   "[console.error] WebSocket connection to 'ws://localhost:5173/?token=0AaLyBGgSfpg' failed: The operation couldn’t be completed. Socket is not connected",
+   "[console.error] %o
+
+ %s
+
+ %s
+  TypeError: Importing a module script failed. The above error occurred in one of your React components. React will try to recreate this component tree from scratch using the error boundary you provided, RouteErrorBoundary.",
+   "[console.error] [RouteErrorBoundary] TypeError: Importing a module script failed. {componentStack: 
+ Lazy@unknown:0:0
+ Suspense@unknown:0:0
+ RouteErrorB…oviders.tsx:14:32
+ App@unknown:0:0
+ div@unknown:0:0}",
+   "[pageerror] Error: send was called before connect",
+   "[pageerror] Error: send was called before connect",
+   "[pageerror] Error: send was called before connect",
+ ]
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('auth-email-input')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - paragraph [ref=e5]: This screen could not load.
  - button "Reload" [ref=e6]
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test';
  2  | 
  3  | export class AuthHelper {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   async signIn(
  7  |     email = process.env.PLAYWRIGHT_TEST_EMAIL ?? '',
  8  |     password = process.env.PLAYWRIGHT_TEST_PASSWORD ?? '',
  9  |   ) {
  10 |     await this.page.goto('/sign-in');
> 11 |     await this.page.getByTestId('auth-email-input').fill(email);
     |                                                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  12 |     await this.page.getByTestId('auth-password-input').fill(password);
  13 |     await this.page.getByTestId('auth-sign-in-button').click();
  14 |     await this.page.waitForURL('/');
  15 |   }
  16 | }
  17 | 
```