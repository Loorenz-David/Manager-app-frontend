# PLAN_sign_in_page_20260520

## Metadata

- Plan ID: `PLAN_sign_in_page_20260520`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T15:09:36Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Build the sign-in page — a mobile-first login form with email and password fields using the `TextInput` primitive, react-hook-form with `zodResolver`, form state shared via `FormProvider`, and a polished UI that handles both service error envelopes (`{ ok: false, error }`) and rate-limit errors (`{ detail }`).
- Business/user intent: Managers and admins sign in with email and password. There is no self-registration — accounts are created internally. The page must surface all backend error messages clearly (invalid credentials, no workspace membership, rate limiting).
- Non-goals: Sign-up flow, password reset, OAuth/SSO, remember-me, multi-factor auth.

## Scope

- In scope:
  - **`src/lib/api-client.ts`** — Fix 429 handling: add `case 429: return 'rate_limited'` to `codeFromStatus`; add `{ detail }` fallback parsing in `handleErrorResponse` so the rate-limit message is passed through to callers correctly.
  - **`architecture/04_api_client_local.md`** — Document the rate-limit error shape `{ detail: string }` as a second error envelope.
  - **`src/features/auth/types.ts`** — New file: `SignInFormSchema` (Zod) + `SignInFormInput` (inferred type).
  - **`src/features/auth/hooks/use-sign-in-form.ts`** — New file: `useSignInForm()` — `useForm` + `zodResolver(SignInFormSchema)` + default values.
  - **`src/features/auth/components/SignInForm.tsx`** — New file: form component that wraps with `<FormProvider>`, owns the submit handler, maps errors to `form.setError('root', ...)`, renders email and password fields via private sub-components that use `useFormContext`.
  - **`src/features/auth/index.ts`** — Add `SignInForm` to public exports.
  - **`src/pages/auth/SignInPage.tsx`** — Replace the existing raw-state placeholder with a thin page wrapper that delegates to `SignInForm`.
- Out of scope: Sign-up, password reset, OAuth, navigation guard changes, user profile, permissions UI.
- Assumptions:
  - `react-hook-form` v7 and `@hookform/resolvers` v5 are installed (confirmed in `package.json`).
  - `TextInput` primitive at `@/components/primitives/input` accepts `invalid`, `leftIcon`, `rightIcon`, and all standard `InputHTMLAttributes` (confirmed).
  - `RouteErrorBoundary` exists at `@/components/ui/RouteErrorBoundary` (confirmed).
  - `useSignInMutation` is already implemented and correct at `@/features/auth/api/use-sign-in` (confirmed).
  - The router already wires `SignInPage` under `GuestRoute` at `/sign-in` (confirmed in `router.tsx`).

## Clarifications required

*(none — all backend shapes and component APIs confirmed)*

## Acceptance criteria

1. `npm run typecheck` passes with zero errors after all files are written.
2. The email and password fields display field-level Zod validation errors on submit attempt.
3. A 403 "Invalid credentials." response surfaces its message in a root-level error block (not a toast, not a field error).
4. A 429 rate-limit response surfaces "Rate limit exceeded. Please wait before retrying." in the root-level error block with the actual detail message from the backend.
5. All form controls are visually disabled while the mutation is pending.
6. Successful sign-in navigates to `ROUTES.home`.
7. The sign-in page renders correctly at 375 px viewport width (no horizontal overflow).

## Contracts and skills

### Contracts loaded

Read order (canonical first, local extension second):

- `architecture/09_forms.md` (baseline): Zod-schema-first forms, `useForm` + `zodResolver`, `FormProvider` + `useFormContext` for shared state, `form.setError` for server errors, `noValidate` on `<form>`, `form.handleSubmit` wrapping `onSubmit`.
- `architecture/07_components.md` (baseline): named exports, no default exports, private helpers at module scope, `cn()` for conditional classes, `forwardRef` on primitives.
- `architecture/10_pages.md` (baseline): thin page — `RouteErrorBoundary` wrapper, delegates to feature component, no logic in the page.
- `architecture/14_styling.md` (baseline): Tailwind only, design tokens, `cn()`, `cva` for variants.
- `architecture/04_api_client.md` (baseline): `ApiRequestError` is the only thrown error type.
- `architecture/04_api_client_local.md` (app delta): flat `{ error: string }` service errors, `codeFromStatus` for codes — **plus the rate-limit shape documented in this plan**.
- `architecture/12_auth.md` (baseline): `useSignInMutation` exists and is correct.
- `architecture/12_auth_local.md` (app delta): sign-in body requires `app_scope: 'admin'` (handled in `use-sign-in.ts`, not in the form).

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat error shape, `codeFromStatus` derivation — **updated in this plan to document the rate-limit `{ detail }` envelope**.
- `architecture/12_auth_local.md`: `useSignInMutation` is the existing correct implementation.

### File read intent — pattern vs. relational

Permitted (relational — confirmed before writing the plan):
- `src/features/auth/api/use-sign-in.ts` — to confirm `SignInCredentials` shape (`{ email, password }`) and that `app_scope` is added inside the mutation, not expected from the form.
- `src/features/auth/index.ts` — to see what is currently exported.
- `src/pages/auth/SignInPage.tsx` — to understand what is being replaced.
- `src/components/primitives/input/TextInput.tsx` — to confirm the `TextInputProps` API (`invalid`, `leftIcon`, `rightIcon`, `variant`, `size`).
- `src/components/primitives/shared/primitive-base.ts` — to confirm `INVALID_RING` uses `ring-destructive` token.
- `src/app/router.tsx` — to confirm the sign-in route is already wired.
- `src/lib/api-client.ts` — to locate the exact lines to update for 429 handling.

Prohibited (pattern reads — contracts cover these):
- Reading another form component to understand `useForm` setup → `09_forms.md`.
- Reading another page to understand `RouteErrorBoundary` usage → `10_pages.md`.
- Reading another mutation to understand TanStack Query setup → `08_hooks.md`.

### Skill selection

- Primary skill: N/A — auth sign-in is not a standard CRUD feature; no skill file applies.
- Excluded alternatives: CRUD skill — excluded because sign-in has no list/detail/create pattern.

---

## Backend error shapes — complete reference

There are two different error shapes the sign-in endpoint can return. Both must be handled.

### Service errors (all non-429 failures from `sign_in_user.py`)

```json
{ "error": "Error message here", "ok": false }
```

These arrive as `ApiRequestError` after `handleErrorResponse` parses them. Common messages:
- 403: `"Invalid credentials."`
- 403: `"User has no workspace membership."`
- 500: `"An unexpected internal error occurred."`

### Rate-limit errors (429 from `rate_limit.py`)

```json
{ "detail": "Rate limit exceeded. Please wait before retrying." }
```

This is a FastAPI `HTTPException` raised before the service layer. The body has `detail` instead of `error`. The current `api-client.ts` drops this message (fallthrough returns generic string). **Step 1 of this plan fixes this.**

---

## Implementation plan

### Step 1 — Fix rate-limit handling in `src/lib/api-client.ts`

Two changes in this file:

**1a — Add `case 429` to `codeFromStatus`:**

```ts
// BEFORE (missing 429):
case 503: return 'network_error';
default:  return 'unknown_error';

// AFTER:
case 503:  return 'network_error';
case 429:  return 'rate_limited';
default:   return 'unknown_error';
```

**1b — Add `{ detail }` fallback in `handleErrorResponse`:**

```ts
// src/lib/api-client.ts — handleErrorResponse (replace entire function)
const RateLimitErrorSchema = z.object({ detail: z.string() });

async function handleErrorResponse(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      response.statusText,
    );
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      parsed.data.error,
    );
  }

  // FastAPI HTTPException shape — used by rate_limit.py
  const rateLimitParsed = RateLimitErrorSchema.safeParse(body);
  if (rateLimitParsed.success) {
    throw new ApiRequestError(
      response.status,
      codeFromStatus(response.status),
      rateLimitParsed.data.detail,
    );
  }

  throw new ApiRequestError(
    response.status,
    codeFromStatus(response.status),
    'An unexpected error occurred.',
  );
}
```

`RateLimitErrorSchema` is a module-level `const` defined above `handleErrorResponse`, not inside it.

---

### Step 2 — Update `architecture/04_api_client_local.md`

Append a new section documenting the second error shape and the `rate_limited` code. Add after the existing "Error codes table override" section:

```md
## Rate-limit error shape (FastAPI HTTPException)

The `/api/v1/auth/sign-in` endpoint (and potentially others) can return a 429 via a
FastAPI `HTTPException` raised by the rate-limit middleware. This has a **different body
shape** from the standard service error:

```json
{ "detail": "Rate limit exceeded. Please wait before retrying." }
```

`handleErrorResponse` in `api-client.ts` tries `ApiErrorSchema` first, then
`RateLimitErrorSchema ({ detail: z.string() })` as a fallback. Callers receive an
`ApiRequestError` with `code: 'rate_limited'` and `message` set to the detail string.

Add `429 → 'rate_limited'` to the error codes table.
```

---

### Step 3 — Create `src/features/auth/types.ts`

New file. Per `09_forms.md`, input schemas live in `types.ts`.

```ts
import { z } from 'zod';

export const SignInFormSchema = z.object({
  email:    z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export type SignInFormInput = z.infer<typeof SignInFormSchema>;
```

Note: `app_scope: 'admin'` is NOT in the form schema — it is appended inside `use-sign-in.ts` at the mutation boundary. The form only owns user-visible fields.

---

### Step 4 — Create `src/features/auth/hooks/use-sign-in-form.ts`

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignInFormSchema, type SignInFormInput } from '@/features/auth/types';

export function useSignInForm() {
  return useForm<SignInFormInput>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email:    '',
      password: '',
    },
  });
}
```

---

### Step 5 — Create `src/features/auth/components/SignInForm.tsx`

Full file:

```tsx
import { FormProvider, useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives/input';
import { ApiRequestError } from '@/lib/api-client';
import { useSignInMutation } from '@/features/auth/api/use-sign-in';
import { useSignInForm } from '@/features/auth/hooks/use-sign-in-form';
import type { SignInFormInput } from '@/features/auth/types';

// ─── Private field components ─────────────────────────────────────────────────
// These consume form state from FormProvider via useFormContext.
// They are file-private — not exported.

function EmailField() {
  const { register, formState: { errors } } = useFormContext<SignInFormInput>();
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground" htmlFor="sign-in-email">
        Email
      </label>
      <TextInput
        autoComplete="email"
        id="sign-in-email"
        invalid={Boolean(errors.email)}
        type="email"
        {...register('email')}
      />
      {errors.email ? (
        <p className="text-xs text-destructive">{errors.email.message}</p>
      ) : null}
    </div>
  );
}

function PasswordField() {
  const { register, formState: { errors } } = useFormContext<SignInFormInput>();
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground" htmlFor="sign-in-password">
        Password
      </label>
      <TextInput
        autoComplete="current-password"
        id="sign-in-password"
        invalid={Boolean(errors.password)}
        type="password"
        {...register('password')}
      />
      {errors.password ? (
        <p className="text-xs text-destructive">{errors.password.message}</p>
      ) : null}
    </div>
  );
}

// ─── Public form component ────────────────────────────────────────────────────

type SignInFormProps = {
  onSuccess: () => void;
};

export function SignInForm({ onSuccess }: SignInFormProps): React.JSX.Element {
  const form = useSignInForm();
  const { mutateAsync: signIn, isPending } = useSignInMutation();
  const { handleSubmit, setError, formState: { errors } } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError('root', { message: err.message });
      } else {
        setError('root', { message: 'Something went wrong. Please try again.' });
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={onSubmit}>
        <fieldset className="space-y-5" disabled={isPending}>
          <EmailField />
          <PasswordField />

          {errors.root ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{errors.root.message}</p>
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </fieldset>
      </form>
    </FormProvider>
  );
}
```

**Architecture note — same-feature import exception:**
`SignInForm` imports `useSignInMutation` from `@/features/auth/api/use-sign-in`. This is the same feature, not a cross-feature import. Auth is a special case: it is the session bootstrap mechanism, not a domain CRUD feature. There is no provider/controller chain for sign-in because it is a single point-in-time mutation with no server state to cache or query. This is consistent with `use-auth.ts` importing `useSignOutMutation` from the same `api/` directory.

**`fieldset disabled` note:**
`<fieldset disabled>` propagates the `disabled` state to all descendant form controls. `TextInput`'s wrapper uses `has-[:disabled]` CSS to apply muted styling automatically. The submit button's `disabled:cursor-not-allowed disabled:opacity-60` classes apply via CSS `:disabled` pseudo-class — no redundant prop needed.

---

### Step 6 — Update `src/features/auth/index.ts`

Add `SignInForm` to the public exports. Replace entire file:

```ts
export { AuthProvider }       from './components/AuthProvider';
export { GuestRoute }         from './components/GuestRoute';
export { ProtectedRoute }     from './components/ProtectedRoute';
export { SignInForm }         from './components/SignInForm';
export { useAuth }            from './hooks/use-auth';
export { useSignInMutation }  from './api/use-sign-in';
export { useSignOutMutation } from './api/use-sign-out';
```

---

### Step 7 — Replace `src/pages/auth/SignInPage.tsx`

Replace the entire file. The page is a thin wrapper that owns the layout, boot skeleton boundary, and navigation callback. No form logic, no mutation, no hooks other than `useNavigate`.

```tsx
import { useNavigate } from 'react-router-dom';
import { SignInForm } from '@/features/auth';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { ROUTES } from '@/lib/routes';

export function SignInPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Manager Beyo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your workspace
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SignInForm onSuccess={() => navigate(ROUTES.home, { replace: true })} />
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
```

---

### Step 8 — Run typecheck

```
npm run typecheck
```

Expected: zero errors.

---

## Risks and mitigations

- Risk: `<fieldset disabled>` toggles fieldset border/legend styling in some browsers.
  Mitigation: The form card container (`rounded-2xl border`) is outside the fieldset — only the form controls inside are affected. Add `border-0` to `<fieldset>` if browser defaults add an unwanted border.

- Risk: `errors.root` is typed as `FieldError | undefined` — calling `.message` without a null check will cause a TS error.
  Mitigation: The render guard `{errors.root ? (...) : null}` ensures the message block only renders when `errors.root` is defined.

- Risk: `useFormContext<SignInFormInput>` in `EmailField` / `PasswordField` will throw at runtime if called outside a `FormProvider`.
  Mitigation: Both field components are private and only ever rendered inside `<FormProvider {...form}>` in `SignInForm`. They are not exported, so callers cannot misplace them.

- Risk: `GuestRoute` may navigate to `ROUTES.home` before `onSuccess` fires if `setUser` in the auth store triggers a re-render.
  Mitigation: This is correct behavior — `GuestRoute` detecting `isAuthenticated = true` and redirecting to home IS the success path. The explicit `navigate(ROUTES.home, { replace: true })` in `onSuccess` is belt-and-suspenders and is idempotent with `{ replace: true }`.

- Risk: `RateLimitErrorSchema` is defined at module scope in `api-client.ts` — it is a `z.object` constant that never changes, so there is no re-instantiation cost.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test (backend required): submit invalid credentials → 403 message displayed; submit with rate limit hit → 429 detail message displayed; submit valid credentials → navigate to home.

## Review log

- `2026-05-20T15:09:36Z` — Implemented the planned sign-in form and 429 error handling changes; validated with `npm run typecheck` and `npm run build`; no Playwright specs were available for browser-level validation.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
