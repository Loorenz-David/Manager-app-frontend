# 37 — Keyboard-Aware Inputs Contract

## Definition

On phones, the software keyboard covers the bottom of the viewport. A **keyboard-aware** UI keeps the focused input visible above the keyboard, restores the layout cleanly when the keyboard closes, and never lets the keyboard fight the surface that hosts it.

This behavior is **infrastructure**: it lives in shared chrome (`@beyo/ui` surfaces, the app shell) and a single root provider. Feature pages inherit it for free. A page only writes keyboard code in two situations: it owns a **custom scroll container** inside a surface, or it wants an input that **floats directly above the keyboard**.

```
window.visualViewport  (the only observer)
        ↓  useVisualViewport()  — @beyo/hooks
KeyboardInsetProvider  (one per app, at the root)
        ↓
  ┌─ --keyboard-inset  (CSS var on <html>, continuous px, imperative — no re-render)
  └─ useKeyboardInset() → { isKeyboardOpen }  (boolean, low-frequency, React-reactive)
        ↓
Shared surfaces + app shell consume the var automatically
Opt-in: FloatingKeyboardBar for above-keyboard inputs
```

---

## Responsibility split

| Concern | Owner |
|---|---|
| Observing the keyboard (height, open/closed) | `useVisualViewport` (`@beyo/hooks`) — **single observer** |
| Publishing keyboard state app-wide | `KeyboardInsetProvider` (`@beyo/ui`), mounted once at the app root |
| `--keyboard-inset` CSS variable (px, on `<html>`) | `KeyboardInsetProvider` (written imperatively) |
| `isKeyboardOpen` boolean | `useKeyboardInset()` (`@beyo/ui`) |
| Lifting a bottom sheet above the keyboard | `BottomSheetSurface` (`@beyo/ui`) — `bottom: var(--keyboard-inset)` |
| Padding full-height surfaces clear of the keyboard | `ModalSurface`, `SlidePageSurface` (`@beyo/ui`) |
| Padding the main app shell clear of the keyboard | each app's `TabOutlet` |
| Close-time focus safety (no keyboard flash on close) | `BottomSheetSurface` (`@beyo/ui`) |
| An input pinned above the keyboard | `FloatingKeyboardBar` (`@beyo/ui`) — opt-in |
| Default `--keyboard-inset: 0px` | `@beyo/styles` |

---

## How it works

### The provider (one per app)

`KeyboardInsetProvider` is mounted once near the app root, wrapping everything (so both the app shell and all portaled surfaces sit inside one observer). It runs `useVisualViewport()` a single time and exposes keyboard state two ways, deliberately split by update frequency:

- **`--keyboard-inset`** — the live keyboard height in pixels, written **imperatively** to `document.documentElement` on every viewport frame. Because it is a CSS variable and not React state, continuous keyboard animation does **not** re-render the React tree. Anything that needs the pixel value reads it in CSS.
- **`useKeyboardInset() → { isKeyboardOpen }`** — a boolean that flips at most twice per interaction (open / close). This is the only keyboard value that flows through React context. Use it for conditional logic, never for layout pixels.

> There is exactly one `visualViewport` observer in the app — the provider. Never add another; never call `useVisualViewport()` from a feature page. Read `--keyboard-inset` (CSS) or `useKeyboardInset()` (boolean) instead.

### Surfaces are keyboard-aware by default

Every shared surface already consumes `--keyboard-inset`, so any page rendered inside one inherits the behavior with **no page-level code**:

| Surface | Mechanism |
|---|---|
| `BottomSheetSurface` (bottom-anchored, `position: fixed`) | **Lifts**: `bottom: var(--keyboard-inset)` raises the whole sheet above the keyboard |
| `SlidePageSurface`, `ModalSurface` (full-height scroll) | **Pads**: scroll area uses `pb-[calc(var(--safe-bottom)_+_var(--keyboard-inset))]` so the focused field scrolls clear |
| Main app shell (`TabOutlet`) | **Pads**: the tab scroll wrapper uses `pb-[var(--keyboard-inset)]` |

The rule of thumb: a **bottom-anchored** container must be **lifted**; a **full-height scrolling** container must be **padded**.

### Close-time focus safety

When a bottom sheet closed after the keyboard had been used, focus used to be re-applied to the in-sheet input during teardown, briefly re-summoning the keyboard. `BottomSheetSurface` prevents this in shared chrome by (1) passing `onCloseAutoFocus={(e) => e.preventDefault()}` to `Drawer.Content` and (2) blurring the active editable element at the start of its close handler. Feature pages do nothing for this.

---

## How to use it

### Case A — a normal input in a surface (the common case)

Do **nothing**. Put your input on a page, render the page in a surface, and it is keyboard-aware. No imports, no hooks, no classes.

### Case B — a custom scroll container inside a surface

The inset is applied to each surface's **main** scroll container. If your page introduces its **own** nested scroll container (a `div` with `overflow-y-auto`), that inner element bypasses the one that already has the padding — so add the inset yourself:

```tsx
<div className="overflow-y-auto pb-[calc(var(--safe-bottom)_+_var(--keyboard-inset))]">
  {/* your scrollable content with inputs */}
</div>
```

This is the only situation where a normal (non-floating) input needs page-level keyboard code.

### Case C — an input that floats directly above the keyboard

Use `FloatingKeyboardBar` and `preventFocusSteal` from `@beyo/ui`. The primitive owns the entire pattern — it renders your controls inline when the keyboard is closed, mirrors them into a portal pinned above the keyboard when it opens, transfers focus to the floating copy, and tears down cleanly. You declare your controls **once** through the `renderControls` render-prop:

```tsx
import { FloatingKeyboardBar } from '@beyo/ui';
import { NumberInput } from '@/components/primitives';

export function PriceSheetPage() {
  const [price, setPrice] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4 p-6">
      <FloatingKeyboardBar
        renderControls={({ inputRef, preventFocusSteal }) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Price</label>
            <NumberInput ref={inputRef} value={price} onValueChange={setPrice} />
            <button type="button" onMouseDown={preventFocusSteal} onClick={() => setPrice(0)}>
              Reset
            </button>
          </div>
        )}
      />
      <SaveButton value={price} />
    </div>
  );
}
```

Rules for `renderControls`:

- Attach the provided **`inputRef`** to the input that should hold focus while the keyboard is open. Do not create your own ref for it.
- Put **`onMouseDown={preventFocusSteal}`** on every button/interactive element inside the bar, so tapping it does not blur the input and dismiss the keyboard.
- Bind your controls to your own state as usual. The primitive renders the controls in two places bound to the same state; you do not manage the duplication or the focus transfer.

The only dependency is that `KeyboardInsetProvider` is mounted at the app root — it already is in every app.

**Canonical reference implementation:** `apps/managers-app/.../pages/tasks/ItemUpholsteryAmountSheetPage.tsx`.

---

## Edge cases and modification points

- **Adding a new app.** Mount `KeyboardInsetProvider` once at the root, wrapping the whole tree (above the surface layer). Without it, `--keyboard-inset` stays `0px` and `isKeyboardOpen` is always `false` — nothing is keyboard-aware.
- **Adding a new surface type.** Decide lift vs. pad by anchoring: bottom-anchored (`position: fixed; bottom`) → set `bottom: var(--keyboard-inset)` on the content; full-height scroll → add the inset padding to the scroll area. If the surface traps focus or is a dialog, also add the close-time focus safety (`onCloseAutoFocus` prevent + blur on close), matching `BottomSheetSurface`.
- **Custom scroll containers.** See Case B — the inset only reaches the surface's primary scroll wrapper; nested scroll regions must opt in.
- **Reading the pixel height.** It is **not** on the context. `useKeyboardInset()` returns only `{ isKeyboardOpen }`. For pixels, consume `var(--keyboard-inset)` in CSS/Tailwind (`bottom-[var(--keyboard-inset)]`, `pb-[var(--keyboard-inset)]`). This split is intentional — it keeps continuous keyboard motion out of React.
- **Unsupported runtimes.** Where `window.visualViewport` is absent, the provider leaves `--keyboard-inset` at `0px` and `isKeyboardOpen` at `false` (graceful no-op). Never assume the keyboard inset is non-zero.
- **Modifying the engine.** Changes to keyboard math live in `useVisualViewport` (`@beyo/hooks`); changes to how state is published live in `KeyboardInsetProvider` (`@beyo/ui`). Both are shared and affect every app — change there once, never fork per app or per page.

---

## What keyboard-aware code must NOT do

- **Never call `useVisualViewport()` or add a `visualViewport` listener in a feature page.** The provider is the single observer; read `--keyboard-inset` or `useKeyboardInset()`.
- **Never re-implement the keyboard lift, the floating bar, or the close-focus fix in a page.** Use the shared surfaces and `FloatingKeyboardBar`.
- **Never put keyboard pixel height into React state or expect it from context.** It is a CSS variable on purpose.
- **Never pad a bottom-anchored sheet to clear the keyboard, or lift a full-height scroll container.** Lift bottom-anchored containers; pad full-height ones.
- **Never copy `KeyboardInsetProvider`, `FloatingKeyboardBar`, or the surfaces into an app.** They are shared in `@beyo/ui`; apps import them.
- **Never hand-roll a duplicate-input "above the keyboard" pattern.** `FloatingKeyboardBar` owns the inline/floating duplication and focus transfer.
- **Never re-enable Vaul `repositionInputs` on `BottomSheetSurface`.** The sheet manages its own keyboard lift; Vaul's repositioning conflicts with it.

---

## Related contracts

- `28_surfaces.md` — surface chrome vs. feature content boundary (where the inset lives).
- `33_vaul_drawer.md` — Vaul ownership for drawer/sheet surfaces.
- `23_providers.md` — provider + consumer-hook shape (`KeyboardInsetProvider`).
- `08_hooks.md` — shared-hook placement (`useVisualViewport` in `@beyo/hooks`).
- `35_shared_packages.md` — why this infrastructure lives in `@beyo/ui` / `@beyo/hooks`.
