import type { Page, Request } from '@playwright/test';
import { expect } from '@playwright/test';

export function waitForApiRequest(
  page: Page,
  urlPattern: string,
  method: string,
): Promise<Request> {
  return page.waitForRequest(
    (req) => req.url().includes(urlPattern) && req.method() === method,
  );
}

export async function assertNoUnexpectedErrors(page: Page, urlPattern: string) {
  const responses: number[] = [];

  page.on('response', (response) => {
    if (response.url().includes(urlPattern)) {
      responses.push(response.status());
    }
  });

  return {
    assert: () => {
      const errors = responses.filter((s) => s >= 400);
      expect(errors, `Unexpected HTTP errors on ${urlPattern}: ${errors.join(', ')}`).toEqual([]);
    },
  };
}
