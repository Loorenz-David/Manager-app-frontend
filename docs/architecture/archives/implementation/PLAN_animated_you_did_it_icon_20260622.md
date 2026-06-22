# PLAN_animated_you_did_it_icon_20260622

## Metadata

- Plan ID: `PLAN_animated_you_did_it_icon_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T15:12:48Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Convert the static `you-did-it-celebration.svg` (a single monolithic `<path>`) into a lightweight animated React SVG component with logical groups and CSS/Framer Motion animations that feel celebratory but non-distracting.
- **Business/user intent:** The celebration overlay that fires when a worker completes a task should feel rewarding. A bouncing, waving character with a popping text arc is significantly more engaging than the static icon currently shown.
- **Non-goals:**
  - Do not introduce Lottie, GSAP, or any new animation runtime library.
  - Do not modify the existing static `you-did-it-celebration.svg` file — the original must remain available for fallback use (e.g., the `?react` import in the controller).
  - Do not port this to the managers app in this plan (mentioned as future possibility only).
  - Do not replace the confetti particle system — the animated icon supplements it.

## Scope

- **In scope:**
  - Manual path decomposition of the current single-path SVG into semantically named `<g>` groups.
  - A new `YouDidItCelebrationIcon.tsx` component in `packages/celebration/src/components/`.
  - A companion `you-did-it-celebration.css` (keyframes) alongside it.
  - Exporting the component from `packages/celebration/src/index.ts`.
  - Updating `MessageLayer.tsx` to render the animated component as the `headline` ReactNode instead of the raw static SVG import.
  - Updating `use-task-step-detail.controller.ts` to pass the animated component.
  - Reduced-motion support via `prefers-reduced-motion` media query (CSS) and `useReducedMotion()` (Framer Motion entrance).
  - Full TypeScript types for the component API.

- **Out of scope:**
  - Automated path tracing or third-party SVG splitting tools.
  - Sound or haptics changes.
  - Any modification to the confetti system.
  - Moving the component to `packages/ui`.

- **Assumptions:**
  - The path decomposition is performed manually by reading coordinate ranges from the existing SVG `d` attribute. Each `M…Z` sub-path is a discrete filled shape; grouping them by spatial zone (top-arc text, character body, arms, motion lines) is sufficient.
  - `packages/celebration` already has `framer-motion` available as a peer dep (confirmed: `MessageLayer` uses `m`, `useReducedMotion`).
  - `packages/celebration` is consumed only by the workers app today, so adding a CSS file is safe as long as it is imported inside the `.tsx` component (Vite handles this).
  - The current static SVG import in `use-task-step-detail.controller.ts` via `?react` will be replaced by the new animated component; the `.svg` file remains on disk untouched.

## Clarifications required

_None — all architectural questions resolved during exploration._

## Acceptance criteria

1. The animated icon renders visually close to the current static SVG; no shapes are missing or misaligned.
2. Body bounce, arm wave, text pop, and motion-line pulse animations all play in a continuous, seamless loop.
3. `animated={false}` prop renders the icon completely static (same appearance as the current import).
4. When `prefers-reduced-motion: reduce` is active, all looping animations are disabled; only a single gentle fade-in entrance plays.
5. `currentColor` is preserved — changing `className="text-white"` to any color recolors the entire icon.
6. `title` prop renders a `<title>` element inside the SVG for screen readers; `decorative={true}` renders `aria-hidden="true"` instead.
7. `npm run typecheck` passes with zero errors across all packages.
8. The original `you-did-it-celebration.svg` file remains unchanged on disk.

## Contracts and skills

### Contracts loaded

- N/A — this is an isolated UI component with no server state, queries, or mutations.

### Local extensions loaded

- N/A

### File read intent — pattern vs. relational

Permitted reads during implementation:
- `packages/celebration/src/components/MessageLayer.tsx` — understand how `headline` ReactNode is rendered and what className context exists.
- `packages/celebration/src/index.ts` — verify current exports before adding new one.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts` — understand the existing `createElement` call to replace it.
- `packages/lib/src/animation.ts` — read `transitions` constants for the entrance animation timing.
- `apps/workers-app/ManagerBeyo-app-workers/src/assets/icons/you-did-it-celebration.svg` — read the raw path `d` attribute to perform the grouping.

### Skill selection

- Primary skill: N/A (direct implementation by Codex)
- Trigger terms: SVG animation, CSS keyframes, framer-motion

## Implementation plan

### Step 1 — Decompose the SVG path into groups

Read `src/assets/icons/you-did-it-celebration.svg`. The single `<path fill="currentColor" fill-rule="evenodd" d="...">` contains approximately 25 `M…Z` sub-paths. Split them into the following four semantic groups by their bounding coordinate ranges (viewBox: `0 0 440 526`):

| Group | CSS class | Coordinate zone | Visual content |
|---|---|---|---|
| Text arc | `ydi-text` | x: 120–380, y: 10–120 | "You Did It!!" arced lettering |
| Character | `ydi-character` | x: 60–400, y: 60–380 | Head, torso, arms, hands, legs |
| Left arm | `ydi-arm-left` | x: 60–200, y: 100–230 | Left arm / reaching hand |
| Right arm | `ydi-arm-right` | x: 300–440, y: 100–230 | Right arm / reaching hand |
| Motion lines | `ydi-motion-lines` | x: 0–60 and x: 390–440, y: 130–210 | Side speed lines |

**How to split:** Each `M…Z` segment in the `d` attribute is a closed shape. Assign each segment to the group whose coordinate range it falls in. The result is five `<path>` (or `<g>` containing multiple `<path>`) elements inside one `<svg>`.

> **Practical approach for Codex:** iterate over all `M…Z` sub-paths, parse the first `M x y` coordinate of each sub-path, and assign the sub-path to the group whose zone contains that `(x, y)` starting point. Write the five grouped paths into the new component file.

The restructured SVG skeleton:

```tsx
<svg viewBox="0 0 440 526" fill="currentColor" ...>
  <g className="ydi-text">
    <path fillRule="evenodd" d="...text sub-paths..." />
  </g>
  <g className="ydi-arm-left">
    <path fillRule="evenodd" d="...left-arm sub-paths..." />
  </g>
  <g className="ydi-arm-right">
    <path fillRule="evenodd" d="...right-arm sub-paths..." />
  </g>
  <g className="ydi-character">
    <path fillRule="evenodd" d="...body sub-paths..." />
  </g>
  <g className="ydi-motion-lines">
    <path fillRule="evenodd" d="...motion-line sub-paths..." />
  </g>
</svg>
```

> **Verification:** After splitting, render the new SVG in the browser at full size. Compare visually against the static original. All shapes must appear; no shapes should be missing or duplicated.

---

### Step 2 — Create the CSS keyframes file

Create `packages/celebration/src/components/you-did-it-celebration.css`:

```css
/* ─── You Did It Icon Animations ─────────────────────────── */

@keyframes ydi-bounce {
  0%, 100% { transform: translateY(0); }
  40%       { transform: translateY(-6px); }
  60%       { transform: translateY(-3px); }
}

@keyframes ydi-arm-left {
  0%, 100% { transform-origin: 180px 200px; transform: rotate(0deg); }
  40%       { transform-origin: 180px 200px; transform: rotate(-18deg); }
  60%       { transform-origin: 180px 200px; transform: rotate(-8deg); }
}

@keyframes ydi-arm-right {
  0%, 100% { transform-origin: 280px 200px; transform: rotate(0deg); }
  40%       { transform-origin: 280px 200px; transform: rotate(18deg); }
  60%       { transform-origin: 280px 200px; transform: rotate(8deg); }
}

@keyframes ydi-text-pop {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.04); }
}

@keyframes ydi-motion-lines {
  0%, 100% { opacity: 1; transform: scaleX(1); }
  50%       { opacity: 0.4; transform: scaleX(0.7); }
}

/* Apply animations */
.ydi-animated .ydi-character {
  animation: ydi-bounce 1.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
}

.ydi-animated .ydi-arm-left {
  animation: ydi-arm-left 1.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
}

.ydi-animated .ydi-arm-right {
  animation: ydi-arm-right 1.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
}

.ydi-animated .ydi-text {
  animation: ydi-text-pop 2.4s ease-in-out infinite;
}

.ydi-animated .ydi-motion-lines {
  animation: ydi-motion-lines 1.6s ease-in-out infinite;
}

/* Reduced motion: disable all loops */
@media (prefers-reduced-motion: reduce) {
  .ydi-animated .ydi-character,
  .ydi-animated .ydi-arm-left,
  .ydi-animated .ydi-arm-right,
  .ydi-animated .ydi-text,
  .ydi-animated .ydi-motion-lines {
    animation: none;
  }
}
```

> **Note on `transform-origin`:** SVG `transform-origin` uses the SVG coordinate system, not the element bounding box. The values `180px 200px` (left arm pivot) and `280px 200px` (right arm pivot) are approximate shoulder coordinates in the `0 0 440 526` viewBox. Codex should inspect the actual arm group bounding boxes and adjust accordingly after the visual verification in Step 1.

---

### Step 3 — Create the `YouDidItCelebrationIcon.tsx` component

Create `packages/celebration/src/components/YouDidItCelebrationIcon.tsx`:

```tsx
import { m, useReducedMotion } from "framer-motion";
import { cn } from "@beyo/lib";
import { transitions } from "@beyo/lib";
import "./you-did-it-celebration.css";

type YouDidItCelebrationIconProps = {
  className?: string;
  animated?: boolean;
  title?: string;
  decorative?: boolean;
};

export function YouDidItCelebrationIcon({
  className,
  animated = true,
  title,
  decorative = false,
}: YouDidItCelebrationIconProps): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animated && !reduceMotion;

  const svgProps = decorative
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": title ?? "You did it celebration" };

  return (
    <m.svg
      animate={{ opacity: 1, scale: 1 }}
      className={cn(className)}
      fill="currentColor"
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.7 }}
      transition={
        reduceMotion
          ? transitions.base
          : { type: "spring", damping: 14, stiffness: 220, delay: 0.05 }
      }
      viewBox="0 0 440 526"
      xmlns="http://www.w3.org/2000/svg"
      {...svgProps}
      data-animated={shouldAnimate ? "true" : undefined}
    >
      {title && !decorative ? <title>{title}</title> : null}

      {/* Wrapper that receives .ydi-animated class to activate CSS keyframes */}
      <g className={shouldAnimate ? "ydi-animated" : undefined}>
        <g className="ydi-text">
          <path fillRule="evenodd" d="...text sub-paths from Step 1..." />
        </g>
        <g className="ydi-arm-left">
          <path fillRule="evenodd" d="...left-arm sub-paths from Step 1..." />
        </g>
        <g className="ydi-arm-right">
          <path fillRule="evenodd" d="...right-arm sub-paths from Step 1..." />
        </g>
        <g className="ydi-character">
          <path fillRule="evenodd" d="...body sub-paths from Step 1..." />
        </g>
        <g className="ydi-motion-lines">
          <path fillRule="evenodd" d="...motion-line sub-paths from Step 1..." />
        </g>
      </g>
    </m.svg>
  );
}
```

> The `m.svg` from Framer Motion handles the entrance animation (opacity + scale spring). The CSS keyframes handle the continuous looping. This hybrid matches the existing pattern in `MessageLayer.tsx`.

---

### Step 4 — Export from `packages/celebration/src/index.ts`

Add to the existing exports:

```ts
export { YouDidItCelebrationIcon } from "./components/YouDidItCelebrationIcon";
```

---

### Step 5 — Update `MessageLayer.tsx` to remove the static SVG wrapper

`MessageLayer.tsx` currently renders `{message.headline}` inside a `<m.div>` with its own entrance animation. Since `YouDidItCelebrationIcon` now handles its own entrance via `m.svg`, the outer `<m.div>` in `MessageLayer` will double-animate.

**Fix:** Remove the entrance `animate`/`initial` props from the `<m.div>` wrapper in `MessageLayer.tsx`, leaving it as a plain `<div>` (or keep it as `<m.div>` with no animation props). The entrance now lives entirely inside `YouDidItCelebrationIcon`.

Updated `MessageLayer.tsx` headline block:

```tsx
<div>
  {message.headline}
</div>
```

---

### Step 6 — Update `use-task-step-detail.controller.ts`

Replace the current static SVG `createElement` call with the animated component:

```ts
import { YouDidItCelebrationIcon } from "@beyo/celebration";
// Remove: import YouDidItCelebration from "@/assets/icons/you-did-it-celebration.svg?react";
// Remove: import { ..., createElement } from "react";

// In the triggerCelebration call:
triggerCelebration(
  celebrationPresets.TASK_COMPLETE(
    claims?.username ?? "",
    createElement(YouDidItCelebrationIcon, {
      className: "h-48 w-auto",
      animated: true,
      decorative: true,
    }),
  ),
);
```

> `createElement` is still needed since the controller is a `.ts` file (no JSX). If `createElement` was only used for the SVG import, clean up that import.

---

### Step 7 — Typecheck

```bash
npx tsc --project packages/celebration/tsconfig.json --noEmit
npx tsc --project apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json --noEmit
```

Both must pass with zero errors.

## Risks and mitigations

- **Risk:** Path grouping assigns a sub-path to the wrong visual group, causing a shape to animate with the wrong part (e.g., a text letter bouncing with the body).
  **Mitigation:** Step 1 includes a mandatory visual verification before proceeding. Inspect each group in the browser with a distinct temporary `fill` color to confirm assignment. Restore `currentColor` after verification.

- **Risk:** `transform-origin` for arm rotation may not work correctly in all browsers for SVG elements without `transform-box: fill-box`.
  **Mitigation:** Add `transform-box: fill-box;` to `.ydi-arm-left` and `.ydi-arm-right` in the CSS file. This makes `transform-origin: center` relative to the element's bounding box rather than the SVG viewport.

- **Risk:** The CSS file import in the `.tsx` component may not be picked up by Tailwind v4's source scan, causing `ydi-*` class names to be stripped.
  **Mitigation:** The `ydi-*` classes are in the CSS file itself, not in Tailwind utility classes — Tailwind does not touch them. The CSS import is processed by Vite directly. No action needed.

- **Risk:** Framer Motion entrance on `m.svg` plus CSS bounce loop on inner `<g>` may conflict visually (both run `transform`).
  **Mitigation:** The `m.svg` entrance applies `scale` to the `<svg>` element; CSS bounce applies `translateY` to the inner `<g>`. These are on different DOM nodes so they compose without conflict. If visual issues appear, move the entrance to a wrapper `<div>` and keep the `<svg>` plain.

- **Risk:** `cn` utility from `@beyo/lib` may not be available in the celebration package.
  **Mitigation:** Confirm `cn` is exported from `@beyo/lib` before using it. If not, use a plain string or `clsx` which is already a dep in the workspace.

## Validation plan

- `npm run typecheck` from workspace root: zero errors
- Visual QA in browser (workers dev server at port 5174):
  - Complete a task step with accurate time to trigger the celebration overlay
  - Confirm the animated icon appears with bounce, arm wave, text pop, and motion-line pulse
  - Confirm the username subline appears below in Fredoka font
  - Confirm `animated={false}` renders static (test by temporarily passing the prop)
  - Enable "Reduce motion" in macOS/iOS accessibility settings and confirm all loops stop; only fade-in plays
  - Change `className="h-48 w-auto text-red-500"` temporarily to confirm `currentColor` propagates to all parts

## Review log

- `2026-06-22T15:12:48Z` — Implemented the animated celebration icon component, exported it from `@beyo/celebration`, switched the workers completion trigger to the new component, and passed `npm run typecheck`.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
