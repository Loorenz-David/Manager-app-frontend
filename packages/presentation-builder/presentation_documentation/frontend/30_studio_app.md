# 30 — Studio shell (`apps/presentation-studio`)

`apps/presentation-studio/ManagerBeyo-app-presentation-studio/` — a deliberately thin
Vite + React app. **If your intention involves presentation features, you are almost
certainly in the wrong place** — features live in `@beyo/presentation-builder`
(docs 20–22). The shell only exists so the builder package has a desktop host:
routing, auth, env, chrome. Cold-hosting guide for transplants:
`docs/handoff/from_frontend/HANDOFF_presentation_builder_hosting_20260722.md`.

## Files (`src/`)

| File | Role |
|---|---|
| `main.tsx` / `app/App.tsx` / `app/providers.tsx` | Boot: React Query client, auth/session providers, toaster. Signs in under **`appScope="manager"`** — authoring rights come from *role* (admin + manager) via `usePresentationBuilderPermissions`, never from app scope (V1 resolution). |
| `app/router.tsx` + `lib/routes.ts` | Route table: `/` dashboard, editor detail route, sign-in, and **dev-only kit routes** `/kit/{dashboard,editor,timeline,publish,player}` (guarded by `import.meta.env.DEV`). |
| `app/RootRoute.tsx` / `components/AuthRoutes.tsx` | Auth gating / redirect. |
| `components/AppShell.tsx` | Desktop chrome. **Height chain matters**: `flex h-screen flex-col` with `min-h-0 flex-1` main — the editor's `EditorShell` uses `h-full` inside it. Breaking this chain once pushed the timeline dock off-viewport. |
| `components/RouteErrorBoundary.tsx` / `RouteLoadingFallback.tsx` / `lib/lazy-route.tsx` | Lazy route plumbing. |
| `pages/DashboardPage.tsx` / `pages/EditorPage.tsx` | One-liner hosts: mount `DashboardView` (inside `PresentationDashboardProvider`) / `EditorView` from the builder package. |
| `pages/SignInPage.tsx` | Auth screen. |
| `pages/dev/*KitPreviewPage.tsx` | Mount the five kit showcases exported by the packages (incl. the player kit from `@beyo/presentations`). |
| `lib/env.ts` | Env schema (API base URL etc. — `.env` per workspace conventions). |

## Upstream / downstream

- **Upstream:** `@beyo/presentation-builder` (views + kit showcases),
  `@beyo/presentations` (player kit showcase only), shared auth/api/ui packages.
- **Downstream:** nothing imports the shell. Dev server: **user-started** (ask; port
  5176 in the current local setup).

## Rules

- Keep it thin. New screens = new view in the builder package + a one-liner page here.
- Never gate anything on `app_key` here; role decides.
- Kit routes stay DEV-only.
