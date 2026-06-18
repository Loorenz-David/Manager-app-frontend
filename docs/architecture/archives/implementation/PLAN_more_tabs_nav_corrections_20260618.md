# PLAN_more_tabs_nav_corrections_20260618

## Metadata

- Plan ID: `PLAN_more_tabs_nav_corrections_20260618`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-18T00:00:00Z`
- Last updated at (UTC): `2026-06-18T13:07:58Z`
- Related issue/ticket: `—`
- Intention plan: `—` (correction pass; source review is in conversation context)
- Parent plan: `docs/architecture/archives/implementation/PLAN_more_tabs_nav_20260618.md`

---

## Goal and intent

- **Goal:** Apply 5 targeted corrections identified in the post-implementation review of `PLAN_more_tabs_nav_20260618`. No new behaviour is introduced — this is a bug-fix and cleanup pass only.
- **Business/user intent:** Ensure the More-tabs nav feature is free of dead code, layout bugs, and an invalid CSS class before the feature goes to manual QA.
- **Non-goals:** Any change to routing, routes constants, AppShell, badge logic, or animation timing. No new files.

---

## Scope

- **In scope:** The 5 corrections listed below — nothing else.
- **Out of scope:** Refactoring beyond the minimum needed to fix each item.
- **Assumptions:** All files are exactly as described in the review; no further changes have been made since the summary was written.

---

## Clarifications required

_None — all corrections are unambiguous._

---

## Acceptance criteria

1. `npm run typecheck` passes with zero errors after all corrections.
2. `origin-bottom-gpu` does not appear anywhere in the codebase.
3. `selectMoreTab` is wrapped in `useCallback` with an empty dependency array in both hook files.
4. `MoreTabRow` no longer accepts or uses an `isActive` prop; the component always renders with `text-icon` color and no `aria-current`.
5. `VerticalScrollArea` scrollable div has `flex-1 min-w-0` in its default classes; track div has `flex-shrink-0`.
6. `MoreTabsPopup` in both apps no longer passes `className="w-full"` to `VerticalScrollArea`.
7. The managers app `<nav>` in `BottomTabBar.tsx` has `z-[50]` matching the workers app.

---

## Contracts and skills

_This is a micro-fix pass. No contracts need to be loaded — all changes are line-level edits to files already read in the parent session. Reading the 6 target files is sufficient._

### File read intent

All reads are relational (understanding what exists before editing):
- `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx`
- `packages/ui/src/components/primitives/vertical-scroll-area/index.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/use-more-tab-last-selected.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx`

---

## Implementation plan

Apply the corrections in this order. Each step is a self-contained edit to a single file.

---

### Correction 1 — Fix `origin-bottom-gpu` in managers `MoreTabsPopup.tsx`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx`

`origin-bottom-gpu` is not a Tailwind utility. It must be replaced with the two valid utilities it was presumably trying to combine.

```diff
-       "origin-bottom-gpu will-change-transform",
+       "origin-bottom transform-gpu will-change-transform",
```

---

### Correction 2 — Fix `origin-bottom-gpu` in workers `MoreTabsPopup.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx`

Identical edit to Correction 1.

```diff
-       "origin-bottom-gpu will-change-transform",
+       "origin-bottom transform-gpu will-change-transform",
```

---

### Correction 3 — Stabilise `selectMoreTab` with `useCallback` in managers hook

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts`

`selectMoreTab` is currently a plain function re-created on every render, making the URL-sync `useEffect` in `BottomTabBar` run after every render instead of only when its values change.

```diff
-import { useState } from "react";
+import { useCallback, useState } from "react";

 export function useMoreTabLastSelected(): {
   lastSelected: MoreTabPath;
   selectMoreTab: (path: MoreTabPath) => void;
 } {
   const [lastSelected, setLastSelected] = useState<MoreTabPath>(readStoredMoreTab);

-  function selectMoreTab(path: MoreTabPath): void {
-    try {
-      localStorage.setItem(STORAGE_KEY, path);
-    } catch {}
-    setLastSelected(path);
-  }
+  const selectMoreTab = useCallback((path: MoreTabPath): void => {
+    try {
+      localStorage.setItem(STORAGE_KEY, path);
+    } catch {}
+    setLastSelected(path);
+  }, []);

   return { lastSelected, selectMoreTab };
 }
```

---

### Correction 4 — Stabilise `selectMoreTab` with `useCallback` in workers hook

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/use-more-tab-last-selected.ts`

Identical edit to Correction 3.

---

### Correction 5 — Remove dead `isActive` prop from managers `MoreTabsPopup.tsx`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx`

`availableMoreTabs` filters out `activeMoreTabPath`, so `isActive={path === activeMoreTabPath}` is always `false`. The prop, `aria-current`, and conditional text colour in `MoreTabRow` are dead code.

Three changes in one file:

**a) Remove `isActive` from `MoreTabRowProps`:**
```diff
 type MoreTabRowProps = {
   path: MoreTabPath;
-  isActive: boolean;
   items: NavTabBadgeItem[];
   visible: boolean;
   onSelect: (path: MoreTabPath) => void;
 };
```

**b) Remove `isActive` from `MoreTabRow` params and simplify the button:**
```diff
 function MoreTabRow({
   path,
-  isActive,
   items,
   visible,
   onSelect,
 }: MoreTabRowProps): React.JSX.Element {
   const meta = MORE_TAB_META[path];
   const Icon = meta.icon;

   return (
     <button
-      aria-current={isActive ? "page" : undefined}
       className={[
         "relative flex h-[60px] w-full flex-col items-center justify-center gap-0.5 text-xs transition-colors",
-        isActive ? "text-primary" : "text-icon",
+        "text-icon",
       ].join(" ")}
```

**c) Remove the `isActive` prop from the `<MoreTabRow>` call site:**
```diff
           <MoreTabRow
             key={path}
-            isActive={path === activeMoreTabPath}
             items={badgeState[path]?.items ?? []}
             path={path}
             visible={badgeState[path]?.visible ?? false}
             onSelect={onSelectTab}
           />
```

---

### Correction 6 — Remove dead `isActive` prop from workers `MoreTabsPopup.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx`

Identical three-part edit to Correction 5.

---

### Correction 7 — Fix `VerticalScrollArea` flex-row layout

**File:** `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx`

The scrollable div needs `flex-1 min-w-0` so it takes remaining space in the `flex-row` container. The track needs `flex-shrink-0` so it is not compressed.

**a) Scrollable div — add `flex-1 min-w-0`:**
```diff
         className={cn(
-          "overflow-x-hidden overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden",
+          "flex-1 min-w-0 overflow-x-hidden overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden",
           className,
         )}
```

**b) Track div — add `flex-shrink-0`:**
```diff
         className={cn(
-          "relative my-2 mr-0.5 w-px rounded-full bg-muted/30",
+          "relative my-2 mr-0.5 w-px flex-shrink-0 rounded-full bg-muted/30",
           trackClassName,
         )}
```

---

### Correction 8 — Remove redundant `className="w-full"` from managers `MoreTabsPopup.tsx`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx`

Now that `VerticalScrollArea` uses `flex-1` internally, the explicit `w-full` override is no longer needed and was technically wrong in the flex-row context.

```diff
-      <VerticalScrollArea className="w-full" style={{ maxHeight: "240px" }}>
+      <VerticalScrollArea style={{ maxHeight: "240px" }}>
```

---

### Correction 9 — Remove redundant `className="w-full"` from workers `MoreTabsPopup.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx`

Identical edit to Correction 8.

---

### Correction 10 — Add `z-[50]` to managers app `<nav>`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx`

The workers app nav already has `z-[50]`. The managers app was missed. Without it the popup could render behind main-content stacking contexts introduced in future.

```diff
-      className="flex-shrink-0 border-t bg-background"
+      className="flex-shrink-0 border-t bg-background z-[50]"
```

---

## Risks and mitigations

- **Risk:** Removing `isActive` / `aria-current` from `MoreTabRow` could affect accessibility state if the design ever changes to show the active tab in the popup.
  **Mitigation:** Acceptable — the current design explicitly hides the active tab from the popup. If the design changes, the prop can be re-added at that point.

- **Risk:** `useCallback` with empty deps wrapping `setLastSelected` — `setLastSelected` is stable (React guarantee on `useState` setters), so an empty dep array is correct and will not capture a stale reference.

---

## Validation plan

- `npm run typecheck`: zero errors across all three packages/apps touched
- Visual smoke check: open More popup → animation slides up from bottom edge (not center) → select an overflow tab → closes cleanly → refresh → dynamic slot restored

---

## File summary

| # | File | Action |
|---|------|--------|
| 1 | `apps/managers-app/.../shell/MoreTabsPopup.tsx` | Fix `origin-bottom-gpu`, remove dead `isActive`, remove `w-full` |
| 2 | `apps/workers-app/.../shell/MoreTabsPopup.tsx` | Same as #1 |
| 3 | `apps/managers-app/.../shell/use-more-tab-last-selected.ts` | Wrap `selectMoreTab` in `useCallback` |
| 4 | `apps/workers-app/.../shell/use-more-tab-last-selected.ts` | Same as #3 |
| 5 | `packages/ui/.../vertical-scroll-area/VerticalScrollArea.tsx` | Add `flex-1 min-w-0` + `flex-shrink-0` |
| 6 | `apps/managers-app/.../shell/BottomTabBar.tsx` | Add `z-[50]` to `<nav>` |

6 files modified, 0 new files, 10 discrete edits.

---

## Review log

- `2026-06-18T13:07:58Z` — implemented all six file corrections, `npm run typecheck` passed, and `origin-bottom-gpu` was verified absent in the targeted app/UI paths.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
