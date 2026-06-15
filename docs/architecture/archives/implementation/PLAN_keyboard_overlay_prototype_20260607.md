# PLAN_keyboard_overlay_prototype_20260607

## Metadata

- Plan ID: `PLAN_keyboard_overlay_prototype_20260607`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-07T00:00:00Z`
- Last updated at (UTC): `2026-06-07T11:15:22Z`
- Related issue/ticket: `n/a — prototype test only`
- Intention plan: `n/a`

## Goal and intent

- Goal: When the user taps "Edit amount" on an upholstery entry in `TaskUpholsterySection`, the number input and the ×0.25 / ×0.5 shortcut buttons float visually above the mobile keyboard so both remain tappable while typing.
- Business/user intent: The current bottom sheet is clipped by `dvh` when the keyboard opens, hiding the shortcut buttons. This prototype proves the visual viewport pattern works in this PWA before committing to a wider rollout.
- Non-goals: Do not create a reusable primitive or refactor the sheet infrastructure. Do not add tests. Do not change any other sheet or input in the app.

## Scope

- In scope:
  - New hook `use-visual-viewport.ts` that tracks keyboard height via `window.visualViewport`
  - Modifications to `ItemUpholsteryAmountSheetPage.tsx` only:
    - Auto-focus the `NumberInput` on sheet mount
    - When keyboard is open, render a portal floating bar above the keyboard containing a controlled `NumberInput` + shortcut buttons
    - Hide the original input block when the portal bar is active
- Out of scope:
  - Any other page, sheet, or input field
  - New Playwright or unit tests
  - Extracting `FloatingInputBar` into the primitives library
  - Touching the vaul sheet infrastructure or `BottomSheetSurface`
  - Changing the Save button position or behaviour
- Assumptions:
  - `NumberInput` is `forwardRef<HTMLInputElement, NumberInputProps>` (confirmed — agent verified)
  - `window.visualViewport` is available in the target PWA environment (iOS 13.4+, Android Chrome 62+)
  - The app root renders into a single `<div id="root">` that `createPortal` can target via `document.body`
  - The `--safe-bottom` CSS var is already managed externally; this plan does not touch it

## Clarifications required

_None — prototype scope is self-contained._

## Acceptance criteria

1. Opening the "Edit amount" sheet on a mobile device (or mobile Chrome DevTools emulation) auto-focuses the number input and triggers the keyboard.
2. While the keyboard is open, the number input and both shortcut buttons are visible and tappable immediately above the keyboard without any page scroll.
3. Tapping ×0.25 or ×0.5 updates the input value and the keyboard stays open (focus returns to the input).
4. Tapping outside the floating bar (or the keyboard dismiss gesture) closes the keyboard and reveals the normal sheet layout with the input in its original position.
5. The Save button and the optional quantity-changed warning remain in the sheet body and are unaffected.
6. TypeScript reports zero errors (`npm run typecheck`).

## Implementation plan

### Step 1 — `use-visual-viewport` hook

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-visual-viewport.ts` _(new file)_

```ts
import { useEffect, useState } from "react";

type VisualViewportState = {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
};

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - (vv!.height + vv!.offsetTop),
      );
      setState({
        keyboardHeight,
        isKeyboardOpen: keyboardHeight > 100, // threshold guards against URL-bar resize
      });
    }

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
```

**Notes:**
- `keyboardHeight > 100` guards against false positives from the browser URL bar appearing/disappearing (typically ~50–70 px), while keyboard is always >150 px.
- The hook does not depend on `--safe-bottom` and does not write to it.

---

### Step 2 — Modify `ItemUpholsteryAmountSheetPage`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx` _(modify)_

#### 2a — New imports

Add to the top of the file:

```ts
import { useRef, createPortal } from "react";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
```

#### 2b — Add refs and visual viewport state inside `ItemUpholsteryAmountSheetPage`

Below the existing state declarations, add:

```ts
const originalInputRef = useRef<HTMLInputElement>(null);
const portalInputRef = useRef<HTMLInputElement>(null);
const { keyboardHeight, isKeyboardOpen } = useVisualViewport();
```

#### 2c — Auto-focus on mount

Add a new `useEffect` after the existing effects:

```ts
useEffect(() => {
  const timer = setTimeout(() => {
    originalInputRef.current?.focus();
  }, 350); // wait for vaul sheet open animation (~300 ms)
  return () => clearTimeout(timer);
}, []); // intentionally empty — fire once on mount
```

#### 2d — Focus portal input when keyboard opens

Add another `useEffect`:

```ts
useEffect(() => {
  if (isKeyboardOpen) {
    portalInputRef.current?.focus();
  }
}, [isKeyboardOpen]);
```

#### 2e — `applyMultiplier` — keep keyboard open

The shortcut buttons in the portal must not dismiss the keyboard. Add `onMouseDown={(e) => e.preventDefault()}` to both portal buttons (prevents focus loss on iOS). After `applyMultiplier` runs, add a re-focus call:

```ts
function applyMultiplier(factor: MultiplierFactor): void {
  setSelectedFactor(factor);
  setAmountMeters(getComputedAmount(quantity, factor));
  // Re-focus to keep keyboard open after button tap
  setTimeout(() => portalInputRef.current?.focus(), 0);
}
```

#### 2f — Modify the JSX

**Original input block** (the `<div className="flex flex-col gap-1.5">` around the `NumberInput` and the `grid grid-cols-2` shortcut buttons):

- Add `ref={originalInputRef}` to `NumberInput`
- Wrap the entire `<div className="flex flex-col gap-1.5">` in a conditional visibility wrapper:

```tsx
<div className={isKeyboardOpen ? "invisible" : ""}>
  {/* existing input + shortcut buttons unchanged */}
</div>
```

`invisible` hides it visually but keeps its layout space so the sheet height doesn't jump.

**Portal floating bar** — render directly after the `<div className="flex flex-col gap-4 p-6">` opening tag, before anything else:

```tsx
{isKeyboardOpen &&
  createPortal(
    <div
      className="fixed inset-x-0 z-[9999] border-t border-border bg-card px-4 pb-2 pt-3 shadow-xl"
      style={{ bottom: keyboardHeight }}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Amount <span className="font-normal">(optional)</span>
        </label>
        <NumberInput
          ref={portalInputRef}
          allowDecimal
          min={0}
          placeholder="e.g. 2.5"
          step={0.25}
          unitLabel="m"
          value={amountMeters}
          onValueChange={(next) => {
            setSelectedFactor(null);
            setAmountMeters(next ?? null);
          }}
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            onClick={() => applyMultiplier(0.25)}
          >
            × 0.25
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            onClick={() => applyMultiplier(0.5)}
          >
            × 0.5
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )}
```

**Why `onMouseDown={(e) => e.preventDefault()}`:**
iOS Safari does not natively focus `<button>` elements on tap, but to be safe across Android Chrome too, `preventDefault` on `mousedown` stops the browser from shifting focus away from the `NumberInput` before the `click` event fires.

---

### Step 3 — Verify TypeScript

Run `npm run typecheck` from the repo root. Fix any errors before marking the plan complete.

## Risks and mitigations

- Risk: On some Android versions the `visualViewport` resize event fires before the keyboard animation finishes, causing the portal bar to flicker during the keyboard slide-up.
  Mitigation: A 16 ms debounce on the `update` function in `useVisualViewport` smooths the transition. Codex may add this if the flicker is noticeable.

- Risk: `vaul` sheet's `modal={false}` or `dismissible` prop might intercept touch events on the portal bar (portal is outside the vaul DOM tree, so this is unlikely, but worth noting).
  Mitigation: Prototype only — if touch interception occurs, add `pointer-events: all` to the portal container.

- Risk: The `dvh` shrink in the vaul sheet causes a visual gap between the hidden original input and the portal bar. The `invisible` wrapper keeps the layout space, preventing this.

- Risk: iOS 15 and below: `visualViewport` fires `resize` but `offsetTop` may be 0. The formula `window.innerHeight - (vv.height + vv.offsetTop)` still produces the correct keyboard height on those versions.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual test on mobile Chrome DevTools (iPhone 14 Pro preset): open the "Edit amount" sheet → keyboard appears automatically → portal bar is visible above keyboard → ×0.25/×0.5 update the value without dismissing keyboard → dismiss keyboard → sheet shows normal layout

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `David`
