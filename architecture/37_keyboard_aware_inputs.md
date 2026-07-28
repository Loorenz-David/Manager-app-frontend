# 37 — Keyboard-Aware Inputs Contract

## Definition

On phones, the software keyboard covers the bottom of the viewport. A **keyboard-aware** UI keeps the focused input visible above the keyboard, restores the layout cleanly when the keyboard closes, and never lets the keyboard fight the surface that hosts it.

This behavior is **infrastructure**: it lives in shared chrome (`@beyo/ui` surfaces, the app shell) and a single root provider. Feature pages inherit it for free. A page only writes keyboard code in two situations: it owns a **custom scroll container** inside a surface, or it wants an input that **floats directly above the keyboard**.

```
window.visualViewport  (the only observer)
        ↓
KeyboardInsetProvider  (one per app, at the root)
        ↓
  ┌─ --keyboard-inset       (CSS var on <html>, continuous px, imperative — no re-render)
  ├─ --viewport-offset-top  (CSS var on <html>, continuous px, imperative — no re-render)
  └─ useKeyboardInset() → { isKeyboardOpen }  (boolean, low-frequency, React-reactive)
        ↓
Shared surfaces + app shell consume the var automatically
Opt-in: FloatingKeyboardBar for above-keyboard inputs
Opt-in: KeyboardAccessoryBar / StagedForm keyboard accessory for multi-field navigation
```

---

## Responsibility split

| Concern | Owner |
|---|---|
| Observing the keyboard (height, open/closed, viewport shift) | `KeyboardInsetProvider` (`@beyo/ui`) — **single `visualViewport` observer** |
| Publishing keyboard state app-wide | `KeyboardInsetProvider` (`@beyo/ui`), mounted once at the app root |
| `--keyboard-inset` CSS variable (px, on `<html>`) | `KeyboardInsetProvider` (written imperatively) |
| `--viewport-offset-top` CSS variable (px, on `<html>`) | `KeyboardInsetProvider` (written imperatively) |
| `isKeyboardOpen` boolean | `useKeyboardInset()` (`@beyo/ui`) |
| Lifting a bottom sheet above the keyboard | `BottomSheetSurface` (`@beyo/ui`) — `bottom: var(--keyboard-inset)` |
| Padding full-height surfaces clear of the keyboard | `ModalSurface`, `SlidePageSurface` (`@beyo/ui`) |
| Padding the main app shell clear of the keyboard | each app's `TabSlideStack` |
| Close-time focus safety (no keyboard flash on close) | `BottomSheetSurface` (`@beyo/ui`) |
| An input pinned above the keyboard | `FloatingKeyboardBar` (`@beyo/ui`) — opt-in |
| Full-height input/content takeover while the keyboard is open | `FloatingKeyboardBar variant="panel"` (`@beyo/ui`) — opt-in |
| Document scroll lock during a raw keyboard panel takeover | `FloatingKeyboardBar` (`@beyo/ui`) — panel variant only |
| Scroll lock of the field's own container behind a docked bar | `FloatingKeyboardBar` (`@beyo/ui`) — bar variant, `lockScroll` opt-in |
| Defaults `--keyboard-inset: 0px`, `--viewport-offset-top: 0px` | `@beyo/styles` |

---

## How it works

### The provider (one per app)

`KeyboardInsetProvider` is mounted once near the app root, wrapping everything (so both the app shell and all portaled surfaces sit inside one observer). It subscribes to `window.visualViewport` a single time and exposes keyboard state three ways, deliberately split by update frequency:

- **`--keyboard-inset`** — the distance, in pixels, from the bottom of the **layout** viewport to the top of the keyboard, written **imperatively** to `document.documentElement` on every viewport frame. Because it is a CSS variable and not React state, continuous keyboard animation does **not** re-render the React tree. Anything that needs the pixel value reads it in CSS.
- **`--viewport-offset-top`** — `visualViewport.offsetTop`, same imperative write. Non-zero only while the browser has shifted the visual viewport (see below).
- **`useKeyboardInset() → { isKeyboardOpen }`** — a boolean that flips at most twice per interaction (open / close). This is the only keyboard value that flows through React context. Use it for conditional logic, never for layout pixels.

#### Why two pixel variables

`html, body` are `overflow: hidden` in these apps, so the document cannot scroll. When iOS needs to reveal a focused field that the keyboard would cover and finds no scrollable ancestor, it shifts the **visual** viewport instead — `visualViewport.offsetTop` becomes non-zero. `position: fixed` stays anchored to the **layout** viewport, so in that state the two coordinate systems differ by `offsetTop`, and anything pinned to the keyboard lands that far off. Hence:

| Anchor | Use |
|---|---|
| `position: fixed; bottom:` (sits on the keyboard) | `var(--keyboard-inset)` — already has the shift subtracted |
| `position: fixed; top:` (aligns with the visible top) | `var(--viewport-offset-top)` |
| `padding-bottom` on an in-flow scroll container | `var(--keyboard-inset)` |

`isKeyboardOpen` is derived from the real keyboard height (`innerHeight - visualViewport.height`), never from the inset — a full-height shift drives the inset to `0px` while the keyboard is very much open.

> There is exactly one `visualViewport` observer in the app — the provider. Never add another; never call `useVisualViewport()` (`@beyo/hooks`) from a feature page. Read `--keyboard-inset` / `--viewport-offset-top` (CSS) or `useKeyboardInset()` (boolean) instead.

### Surfaces are keyboard-aware by default

Every shared surface already consumes `--keyboard-inset`, so any page rendered inside one inherits the behavior with **no page-level code**:

| Surface | Mechanism |
|---|---|
| `BottomSheetSurface` (bottom-anchored, `position: fixed`) | **Lifts**: `bottom: var(--keyboard-inset)` raises the whole sheet above the keyboard |
| `SlidePageSurface`, `ModalSurface` (full-height scroll) | **Pads**: scroll area uses `pb-[calc(var(--safe-bottom)_+_var(--keyboard-inset))]` so the focused field scrolls clear |
| Main app shell (`TabSlideStack`) | **Pads**: the tab scroll wrapper uses `pb-[var(--keyboard-inset)]` |

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

Use `FloatingKeyboardBar` and `preventFocusSteal` from `@beyo/ui`. The primitive owns the entire pattern — it renders your controls inline when the keyboard is closed, mirrors them into a portal pinned above the keyboard when the keyboard opens **for its own input**, transfers focus to the floating copy, and tears down cleanly. You declare your controls **once** through the `renderControls` render-prop:

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
- Everything you render travels together, so put the context that belongs with the field — a running total, a unit breakdown — inside `renderControls` rather than next to the bar. Content left outside stays behind the keyboard.
- The bar docks **only while its own input holds focus**. Other fields on the same page open the keyboard without disturbing it, which is what makes the bar safe inside a multi-field form.
- Pass **`lockScroll`** when nothing may scroll while the bar is docked. It does two things, because a docked bar is reached by two different gestures: it freezes the field's own scroll container (the nested `overflow-y-auto` element inside the surface — not `document.body`, which does not scroll in a surface) for drags on the content behind, and sets `touch-action: none` on the tray for drags on the tray itself, which is portaled to `body` and would otherwise pan the document. Leave it off when the bar is meant to be scrolled past. The `panel` variant always locks and ignores the prop.
- Inside a region wrapped by `KeyboardAccessoryBar` (including a `StagedForm` with `enableKeyboardAccessory`), call `useKeyboardAccessoryPriority(isFloating)` from the docked copy. Both trays share the `--keyboard-inset` anchor, and the claim keeps the generic `Next`/`Done` bar from stacking on top of yours.

The only dependency is that `KeyboardInsetProvider` is mounted at the app root — it already is in every app.

**Canonical reference implementations:** `packages/tasks/src/pages/ItemUpholsteryAmountSheetPage.tsx` (bare sheet) and
`packages/task-creation/src/components/ProductPriceField.tsx` (form field with a docked total, inside a staged form).

#### `variant="panel"`: an input plus full-height takeover

Use the panel variant when the focused input and its narrowed content should take over the
viewport above the software keyboard. `FloatingKeyboardBar` keeps the inline copy in the
document, mirrors the controls into a raw portal, transfers focus to the floating input, and
returns to the inline copy when the input blurs. The callback receives `isFloating` so a
composed primitive can use the same controls in both presentations. `isInlineHidden` is true for
the hidden inline panel copy; overlay content such as a listbox must not render from that copy.
`panelProgress` is the shared Framer Motion value used by composed controls that need to sequence
their own content fade with the panel choreography.

```tsx
<SearchableSelectInput
  options={customerOptions}
  value={customer}
  onValueChange={setCustomer}
  placeholder="Search customers"
/>
```

`SearchableSelectInput` is the canonical consumer of `FloatingKeyboardBar
variant="panel"`; direct render-prop consumers can also use the callback's `isFloating` and
`panelProgress` fields when their content needs the same presentation state.

The panel copy mounts asynchronously after keyboard state opens. `FloatingKeyboardBar` therefore
performs a second layout-effect focus handoff after the panel portal commits; the initial handoff
remains for the synchronous `variant="bar"` copy. Do not hide the inline copy or assume focus has
transferred until this panel-mounted handoff has completed.

The panel is fixed from `top: var(--viewport-offset-top)` (plus whatever part of the safe-area top
it still reaches) to `bottom: var(--keyboard-inset)`, so it covers the visible viewport whether or
not the browser has shifted it. Opening and closing are driven by one `progress` motion
value: `transitions.surface` opens slowly with the emphasized easing and `transitions.base`
closes faster. The panel background fades across that same value, composed content fades in over
the final part of the range, and a `clip-path` inset uses the measured input travel distance as
the wipe boundary. The `clip-path` is a deliberate exception to the transform/opacity
preference because opacity cannot express the required moving visibility boundary. With reduced
motion, the spatial transform and wipe are removed and the panel cross-fades in place.

The panel variant also locks document scrolling for its mounted duration. It uses a custom
`position: fixed` body lock that snapshots the existing inline body styles and scroll position,
then restores both on close. This is separate from Vaul because the panel is a raw portal rather
than a `Drawer.Root`; the option list remains the independent scroll container.

**Canonical reference implementation:**
`packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`.

### Case D — multi-field navigation inside a form region

Use `KeyboardAccessoryBar` when the goal is to keep the real inputs in place and add a shared
toolbar above the keyboard for `Clear` and `Next`/`Done` navigation across multiple text fields.
The primitive wraps a region, listens for focus changes inside it, and only renders while the
keyboard is open and an eligible input or textarea in that region is focused.

```tsx
import { KeyboardAccessoryBar } from "@beyo/ui";

export function CustomerFields() {
  return (
    <KeyboardAccessoryBar>
      <div className="flex flex-col gap-4">
        <TextInput />
        <TextInput />
        <TextArea />
      </div>
    </KeyboardAccessoryBar>
  );
}
```

Rules for `KeyboardAccessoryBar`:

- Wrap the region that owns the text fields you want to traverse.
- Use it for native text inputs and textareas that stay in the normal document flow.
- It is safe to mount multiple instances; only the instance containing the focused field will render.
- Keep picker buttons and non-text controls in the region if needed; they are skipped automatically.

### StagedForm opt-in

`StagedForm` exposes `enableKeyboardAccessory?: boolean` for the common staged-form case. When
enabled, `StagedForm` wraps its active-step `AnimatePresence` content in `KeyboardAccessoryBar`, so
navigation stays inside the currently mounted step without each feature manually wrapping step

```tsx
<StagedForm enableKeyboardAccessory {...props}>
  <StagedFormStep id="customer">...</StagedFormStep>
</StagedForm>
```

The prop defaults to `false`. Forms without it behave exactly as before.

### Which primitive to use

| Need | Primitive |
|---|---|
| One focused input with custom inline/floating controls | `FloatingKeyboardBar` |
| One focused input with a full-height content takeover above the keyboard | `FloatingKeyboardBar variant="panel"` |
| Multiple in-flow text fields with `Clear` and `Next`/`Done` navigation | `KeyboardAccessoryBar` |
| Staged form where the active step should get multi-field keyboard navigation | `StagedForm enableKeyboardAccessory` |

---

## Edge cases and modification points

- **Adding a new app.** Mount `KeyboardInsetProvider` once at the root, wrapping the whole tree (above the surface layer). Without it, `--keyboard-inset` stays `0px` and `isKeyboardOpen` is always `false` — nothing is keyboard-aware.
- **Adding a new surface type.** Decide lift vs. pad by anchoring: bottom-anchored (`position: fixed; bottom`) → set `bottom: var(--keyboard-inset)` on the content; full-height scroll → add the inset padding to the scroll area. If it is also **top**-anchored while the keyboard is open, anchor that edge to `var(--viewport-offset-top)` — `top: 0` is wrong whenever the browser has shifted the visual viewport. If the surface traps focus or is a dialog, also add the close-time focus safety (`onCloseAutoFocus` prevent + blur on close), matching `BottomSheetSurface`.
- **Custom scroll containers.** See Case B — the inset only reaches the surface's primary scroll wrapper; nested scroll regions must opt in.
- **Staged forms.** Prefer `enableKeyboardAccessory` on `StagedForm` over wrapping individual steps by hand when the whole form should opt in.
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
- **Never hand-roll per-step keyboard navigation wrappers in staged forms when the form-level opt-in is sufficient.** Use `enableKeyboardAccessory`.
- **Never re-enable Vaul `repositionInputs` on `BottomSheetSurface`.** The sheet manages its own keyboard lift; Vaul's repositioning conflicts with it.

---

## Related contracts

- `28_surfaces.md` — surface chrome vs. feature content boundary (where the inset lives).
- `33_vaul_drawer.md` — Vaul ownership for drawer/sheet surfaces.
- `23_providers.md` — provider + consumer-hook shape (`KeyboardInsetProvider`).
- `08_hooks.md` — shared-hook placement (`useVisualViewport` in `@beyo/hooks`).
- `35_shared_packages.md` — why this infrastructure lives in `@beyo/ui` / `@beyo/hooks`.
