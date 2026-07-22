# Handoff — host `@beyo/presentation-builder`

## Metadata

- Handoff ID: `HANDOFF_presentation_builder_hosting_20260722`
- Date: 2026-07-22
- Source plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase7_studio_validation_polish_20260722.md`
- Scope: creation/admin studio only; phone-player hosting is not included.

## What the packages provide

- `@beyo/presentation-builder`: validated presentation DTOs, query/mutation hooks, permissions, `DashboardView`, `EditorView`, and the presentational builder kit.
- `@beyo/presentation-runtime`: the shared `SlideCompositionRenderer`, composition schemas, and playback clock used by the editor and preview.
- `@beyo/lib`: `NotificationHostProvider` and the `notify` API used by builder actions.
- `@beyo/auth`, `@beyo/api-client`, and `@beyo/ui`: authentication/session handling, authenticated HTTP, shared primitives, and surface context.

The host owns routing, authentication entry/exit routes, providers, navigation callbacks, environment configuration, and global CSS scanning. The studio app must not contain presentation business logic.

## Install and dependency contract

Use the monorepo workspace packages or published equivalents for:

```json
{
  "dependencies": {
    "@beyo/auth": "*",
    "@beyo/lib": "*",
    "@beyo/presentation-builder": "*",
    "@beyo/presentation-runtime": "*",
    "@beyo/styles": "*",
    "@beyo/ui": "*",
    "@tanstack/react-query": ">=5.0.0",
    "lucide-react": ">=0.400.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0",
    "zod": ">=4.0.0"
  }
}
```

The builder and runtime expose named exports only. Import application-facing APIs from package roots.

## Required CSS setup

For Tailwind CSS v4, include the shared styles and scan every raw-source package that emits classes:

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "<relative-path-to-monorepo>/packages/ui/src";
@source "<relative-path-to-monorepo>/packages/auth/src";
@source "<relative-path-to-monorepo>/packages/presentation-builder/src";
```

Adjust the three paths relative to the host stylesheet. `presentation-runtime` currently renders with inline layout styles and does not require an `@source` entry. The desktop studio assumes a viewport at least 1024 px wide.

## Required provider order

Create one `QueryClient` for the lifetime of the app. The validated studio defaults are a 60-second query `staleTime`, one query retry, and no mutation retries.

```tsx
<QueryClientProvider client={queryClient}>
  <NotificationHostProvider>
    <SurfaceProvider registry={{}}>
      <AuthProvider appScope="manager" signInRoute="/sign-in">
        <RouterProvider router={router} />
      </AuthProvider>
    </SurfaceProvider>
  </NotificationHostProvider>
</QueryClientProvider>
```

Equivalent nesting is acceptable, but all four contexts must exist before either builder view mounts. `AuthProvider` must use `appScope="manager"`; admin and manager workspace roles can manage presentations. A failed refresh or mid-session 401 emits `auth:session-expired`; `AuthProvider` clears auth/query state and navigates to `signInRoute`.

## Route adapters and navigation injection

Keep route modules lazy and keep router imports out of the package. A host adapter supplies navigation:

```tsx
import { DashboardView, EditorView } from "@beyo/presentation-builder";
import { useAuth } from "@beyo/auth";
import { useNavigate, useParams } from "react-router-dom";

export function PresentationDashboardRoute() {
  const navigate = useNavigate();
  const { user, workspaceId } = useAuth();
  return (
    <DashboardView
      navigateToEditor={(id) => navigate(`/presentations/${id}`)}
      workspaceName={user?.workspaceName ?? workspaceId ?? "Workspace"}
      userName={user?.username ?? user?.email ?? "User"}
    />
  );
}

export function PresentationEditorRoute() {
  const navigate = useNavigate();
  const { presentationId = "" } = useParams();
  return (
    <EditorView
      presentationId={presentationId}
      onBack={() => navigate("/presentations")}
      onPresentationIdChange={(id) =>
        navigate(`/presentations/${id}`, { replace: true })
      }
    />
  );
}
```

Lazy-load both adapter modules with the host router. Because package exports are named, a direct `React.lazy` import needs a named-to-default mapping. Wrap lazy elements in the host's route error boundary and Suspense/loading fallback.

## Environment and network expectations

- The API client reads `import.meta.env.VITE_API_URL`; it falls back to `window.location.origin` when empty.
- The reference studio accepts `VITE_API_BASE_URL` and maps it to `VITE_API_URL` in `vite.config.ts`. A different host may expose `VITE_API_URL` directly or provide the same define mapping.
- Local development may proxy `/api` with `API_TARGET_URL`; this variable is build-tool configuration, not browser runtime configuration.
- Auth refresh uses an HTTP-only cookie and `credentials: "include"`. Cross-origin hosting therefore requires backend CORS and cookie settings that permit the host origin.
- Presigned S3 PUT/GET URLs must be reachable from the browser. Upload PUTs send the selected file's `Content-Type` and no application authorization header.
- Do not persist presigned URLs. The builder refetches detail/list data when rendered media reports an expired URL.

## Backend routes and injected data

The host must make the existing presentation admin API and `GET /api/v1/users` reachable under the API base URL. The builder owns the request schemas and all presentation mutations; no endpoint wrapper belongs in the host.

The publish user picker is not injected by the host: `EditorView` queries active workspace users through the builder's `usePresentationUsers` hook. The authenticated claim/store must provide the user, workspace ID, optional workspace display name, workspace role, permissions, and manager app scope.

## Cold-host verification checklist

- [ ] Root imports resolve for builder/runtime/auth/lib/ui; no deep package imports.
- [ ] Tailwind `@source` entries point to `ui`, `auth`, and `presentation-builder` raw sources.
- [ ] Query, notification, surface, and auth providers mount before the routes.
- [ ] `VITE_API_URL` resolves to the backend and refresh cookies work from the host origin.
- [ ] Dashboard and editor adapter modules are lazy chunks with route loading/error fallbacks.
- [ ] Dashboard receives workspace/user display values and an editor-navigation callback.
- [ ] Editor receives back navigation and new-version ID replacement callbacks.
- [ ] Manager/admin sign-in can list, create, edit, preview, publish, version, and archive.
- [ ] A mid-session 401 returns to sign-in; a 409 publish race reloads a friendly read-only state.
- [ ] S3 upload and expired-media refetch work under the deployment CSP/CORS policy.
- [ ] Production build emits no `INEFFECTIVE_DYNAMIC_IMPORT` warning and contains no builder/editor implementation in the initial boot chunk.

