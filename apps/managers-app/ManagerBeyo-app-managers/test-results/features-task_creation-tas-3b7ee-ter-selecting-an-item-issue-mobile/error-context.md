# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features/task_creation/task-creation-form-flow.spec.ts >> Task creation staged forms >> pre-order form still advances after selecting an item issue
- Location: tests/playwright/features/task_creation/task-creation-form-flow.spec.ts:72:3

# Error details

```
Error: page.goto: Could not connect to the server.
Call log:
  - navigating to "http://localhost:5173/sign-in", waiting until "load"

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
> 10 |     await this.page.goto('/sign-in');
     |                     ^ Error: page.goto: Could not connect to the server.
  11 |     await this.page.getByTestId('auth-email-input').fill(email);
  12 |     await this.page.getByTestId('auth-password-input').fill(password);
  13 |     await this.page.getByTestId('auth-sign-in-button').click();
  14 |     await this.page.waitForURL('/');
  15 |   }
  16 | }
  17 | 
```