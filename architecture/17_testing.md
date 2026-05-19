# 17 — Testing Contract

## Definition

Tests verify behavior, not implementation. Each layer of the frontend has a distinct testing approach. Two validation layers are mandatory and serve different purposes. This contract covers the logic and component layer. The runtime validation layer is defined in `34_runtime_validation.md`.

---

## Validation layers

Two distinct validation layers are mandatory. Neither substitutes for the other.

| Layer | Tool | Scope | Completion signal |
|---|---|---|---|
| Logic + component | Vitest + RTL + MSW | Hooks, mutations, components in isolation | Behavioral correctness in a simulated environment |
| Runtime | Playwright | Full browser: DOM, network, animations, gestures, realtime | Feature correctness in the actual browser |

Vitest confirms logic and component behavior. It cannot confirm that drawers open with the correct gesture, that optimistic updates render before the network response, that socket events produce DOM changes, that the correct HTTP requests are sent, or that no console errors occur. Playwright confirms these.

An implementation is not complete until both layers pass. See `34_runtime_validation.md` for the complete runtime validation contract, agent workflow, and completion checklist.

---

## Test stack

| Tool | Role |
|---|---|
| Vitest | Test runner and assertions |
| @testing-library/react | Renders components and queries the DOM |
| @testing-library/user-event | Simulates real user interactions |
| MSW v2 (Mock Service Worker) | Intercepts HTTP requests at the network level |
| @testing-library/jest-dom | DOM-specific matchers (`toBeVisible`, `toHaveValue`, etc.) |

---

## Test layers

### 1. Hook tests

Test business logic hooks in isolation. Use `renderHook` from `@testing-library/react`.

```ts
// src/features/invoices/hooks/use-invoice-filters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useInvoiceFilters } from './use-invoice-filters';

describe('useInvoiceFilters', () => {
  it('resets page to 1 when status changes', () => {
    const { result } = renderHook(() => useInvoiceFilters());

    act(() => { result.current.setPage(3); });
    expect(result.current.filters.page).toBe(3);

    act(() => { result.current.setStatus('paid'); });
    expect(result.current.filters.page).toBe(1);  // reset
  });
});
```

### 2. Query/mutation hook tests

Test TanStack Query hooks with a real QueryClient and MSW mocking the network.

```ts
// src/features/invoices/api/use-invoices.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/utils';
import { server } from '@/test/server';
import { http, HttpResponse } from 'msw';
import { useInvoicesQuery } from './use-invoices';

describe('useInvoicesQuery', () => {
  it('returns invoices on success', async () => {
    server.use(
      http.get('/api/v1/invoices', () =>
        HttpResponse.json({
          items: [{ id: '9f3fb6f8-6f64-4e4e-8d0b-50f4d8706df6', number: 'INV-001', ... }],
          total: 1,
        }),
      ),
    );

    const { result } = renderHook(() => useInvoicesQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
  });

  it('exposes error state on network failure', async () => {
    server.use(
      http.get('/api/v1/invoices', () => HttpResponse.json({ error: { code: 'server_error', message: 'Oops' } }, { status: 500 })),
    );

    const { result } = renderHook(() => useInvoicesQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### 3. Component tests

Test feature components from the user's perspective. Query by accessible role, label, or text — not by test IDs or class names.

```tsx
// src/features/invoices/components/CreateInvoiceForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createWrapper } from '@/test/utils';
import { server } from '@/test/server';
import { http, HttpResponse } from 'msw';
import { CreateInvoiceForm } from './CreateInvoiceForm';

describe('CreateInvoiceForm', () => {
  it('submits valid data and calls onSuccess', async () => {
    server.use(
      http.post('/api/v1/invoices', () =>
        HttpResponse.json({
          invoice: { id: '9f3fb6f8-6f64-4e4e-8d0b-50f4d8706df6', number: 'INV-001', ... },
        }),
      ),
    );

    const onSuccess = vi.fn();
    render(<CreateInvoiceForm onSuccess={onSuccess} />, { wrapper: createWrapper() });

    await userEvent.type(screen.getByLabelText('Due date'), '2026-06-01T00:00');
    await userEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith('9f3fb6f8-6f64-4e4e-8d0b-50f4d8706df6'),
    );
  });

  it('shows field errors on validation_failed response', async () => {
    server.use(
      http.post('/api/v1/invoices', () =>
        HttpResponse.json({
          error: {
            code: 'validation_failed',
            message: 'Validation failed.',
            field_errors: { due_date: ['Due date must be in the future.'] },
          },
        }, { status: 400 }),
      ),
    );

    render(<CreateInvoiceForm onSuccess={vi.fn()} />, { wrapper: createWrapper() });
    await userEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));

    await waitFor(() =>
      expect(screen.getByText('Due date must be in the future.')).toBeVisible(),
    );
  });
});
```

---

## Test utilities

```ts
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}
```

```ts
// src/test/server.ts
import { setupServer } from 'msw/node';
export const server = setupServer();

// src/test/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` causes tests to fail if they make a network request with no matching handler — prevents silent test pass with missing mocks.

---

## Query priorities (RTL)

Query DOM elements in this order of preference:

1. `getByRole` — accessible role (`button`, `heading`, `textbox`, `combobox`)
2. `getByLabelText` — form fields associated with a label
3. `getByPlaceholderText` — inputs with placeholder text
4. `getByText` — visible text content
5. `getByDisplayValue` — current value of an input/select
6. `getByAltText` — image alt text
7. `getByTitle` — title attribute
8. `getByTestId` — last resort in Vitest + RTL tests; **required** in Playwright runtime validation

Never query by class name, ID, or element type.

---

## `data-testid` — runtime validation targets

The query priority above applies to Vitest + RTL component tests — prefer accessible queries. For Playwright runtime validation, `data-testid` is not a last resort. It is the required selector strategy.

All feature-critical interactive elements must expose a stable `data-testid` attribute. Class names, text content, and element structure change with styling and copy updates. `data-testid` attributes are stable contracts between the implementation and the runtime validator.

Feature-critical elements that require `data-testid`:
- Primary action buttons — create, submit, confirm, delete, save
- List and table rows that represent an entity
- Filter and sort controls
- Drawer and modal containers
- Form fields targeted in runtime validation flows
- Status indicators — connection status, empty states, error states

See `34_runtime_validation.md` for the full `data-testid` naming convention and element requirements.

---

## What to test at each layer

| Layer | Test | Skip |
|---|---|---|
| Business logic hooks | All state transitions, all computed values | React internals |
| Query hooks | Success path, error path, loading state | Implementation details of TanStack Query |
| Mutation hooks | Success → cache invalidation, error → error state | |
| Form components | Valid submit, invalid submit, server error display | DOM snapshot tests |
| Feature components | User interactions, visible state changes | Styling, z-index, transitions |
| Shared UI components | Variant rendering, accessibility attributes | Purely visual tests |

---

## What tests must NOT do

- **Never test implementation details.** Test what the user sees and does, not which functions were called.
- **Never `querySelector` or `getElementsByClassName`.** Use RTL's query functions.
- **Never mock TanStack Query internals.** Use MSW to mock the network layer.
- **Never create a test-specific component wrapper** that bypasses the real hook — test the real hook.
- **Never import Zustand stores in tests to set initial state.** Render with the real providers and interact through the UI.
- **Never skip the `onUnhandledRequest: 'error'` option** in the MSW server setup.

---

## Implementation completion

An implementation passes Vitest + RTL tests when each unit and component behavior is verified in isolation. This is necessary but not sufficient.

An implementation is complete only when Playwright runtime validation also passes:

- No console errors during the feature flow
- No uncaught exceptions
- All interaction flows complete successfully in the browser
- Network requests match expected patterns
- Responsive layout validates at mobile (390×844) and desktop (1440×900) viewports
- Realtime synchronization produces correct DOM updates
- Drawer and modal open, close, and gesture behavior succeeds

See `34_runtime_validation.md` for the complete runtime validation protocol, agent workflow, and full completion checklist.
