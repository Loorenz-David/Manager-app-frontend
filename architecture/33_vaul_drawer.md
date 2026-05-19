# 33 — Vaul Drawer Contract

## Definition

Vaul is the container component for all drawer surfaces. It owns the physical interaction layer — gestures, animations, touch, scroll locking, focus trapping, and accessibility semantics — for any `DrawerSurface` in the application.

**Responsibility split:**

| Concern | Owner |
|---|---|
| Drawer gesture (drag to dismiss) | Vaul |
| Drawer animation (spring physics, enter/exit) | Vaul |
| Touch swipe interactions | Vaul |
| Scroll locking while drawer is open | Vaul |
| Focus trapping within the open drawer | Vaul |
| ARIA `role="dialog"`, `aria-modal`, `aria-labelledby` | Vaul |
| Keyboard `Escape` to close | Vaul |
| Backdrop rendering | Vaul (`Drawer.Overlay`) |
| Direction awareness (desktop side / mobile bottom) | `DrawerSurface` via `BreakpointProvider` |
| Surface registry (open/close state, stacking) | Surface Manager — `28_surfaces.md` |
| Feature content, header title, action buttons | Feature pages via `SurfaceHeaderContext` |
| Routing integration, deep links, background location | Router — `11_routing.md`, `28_surfaces.md` |

Framer Motion is **not** used for drawer enter/exit animation or backdrop. Those responsibilities belong entirely to Vaul. Framer Motion remains active for in-content animations (list items, form field transitions, inline state changes) that live inside the drawer's content area.

---

## Installation and setup

```bash
npm install vaul
```

No provider wrapping is needed at the app root. Vaul's `Drawer.Root` is self-contained.

---

## `shouldScaleBackground` wrapper

Vaul can scale the app content behind the drawer when it opens, producing a depth effect. This requires a wrapper div on the root element:

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div vaul-drawer-wrapper="" className="bg-background">
      <App />
    </div>
  </React.StrictMode>,
);
```

The `vaul-drawer-wrapper` attribute must be on the element that wraps all page content — the immediate child of `document.body`. Without it `shouldScaleBackground` silently does nothing.

---

## `DrawerSurface` implementation

`DrawerSurface` is the only file that imports from `vaul`. Feature pages, controllers, and the Surface Manager never import Vaul directly.

```tsx
// src/components/surfaces/DrawerSurface.tsx
import { useState }            from 'react';
import { Drawer }              from 'vaul';
import { useBreakpoint }       from '@/providers/BreakpointProvider';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';
import { cn }                  from '@/lib/utils';

type Props = {
  open:     boolean;
  onClose:  () => void;
  zIndex?:  number;
  children: React.ReactNode;
};

export function DrawerSurface({ open, onClose, zIndex = 50, children }: Props) {
  const { isMobile } = useBreakpoint();
  const [title,   setTitle]   = useState('');
  const [actions, setActions] = useState<React.ReactNode>(null);

  return (
    <SurfaceHeaderContext.Provider value={{ setTitle, setActions }}>
      <Drawer.Root
        open={open}
        onOpenChange={(v) => { if (!v) onClose(); }}
        direction={isMobile ? 'bottom' : 'right'}
        shouldScaleBackground
      >
        <Drawer.Portal>
          <Drawer.Overlay
            className="fixed inset-0 bg-black/40"
            style={{ zIndex }}
          />
          <Drawer.Content
            aria-labelledby="surface-drawer-title"
            className={cn(
              'fixed bg-background shadow-xl flex flex-col focus:outline-none',
              isMobile
                ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[90dvh]'
                : 'right-0 top-0 h-full w-[480px] border-l',
            )}
            style={{ zIndex: zIndex + 1 }}
          >
            {/* Drag handle — visible on mobile only, Vaul attaches gesture to it */}
            {isMobile && (
              <Drawer.Handle className="mx-auto mt-3 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            )}

            <header className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2
                id="surface-drawer-title"
                className="text-lg font-semibold truncate"
              >
                {title}
              </h2>
              <div className="flex items-center gap-2">
                {actions}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 hover:bg-muted"
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </SurfaceHeaderContext.Provider>
  );
}
```

**Why `focus:outline-none` on `Drawer.Content`:** Vaul programmatically focuses the content panel on open. The default browser focus ring is not appropriate on a full panel — the `SurfaceHeaderContext` title and the close button are the natural focus targets inside.

---

## Direction and responsive behaviour

`direction` drives the enter/exit axis and the gesture axis:

| Device | `direction` | Enter from | Drag to dismiss |
|---|---|---|---|
| Desktop (`md+`) | `'right'` | Right edge | Drag right |
| Mobile | `'bottom'` | Bottom edge | Drag down |

`BreakpointProvider` drives the switch — the same instance that controls all responsive decisions in the app (see `27_responsive.md`). Do not read `window.innerWidth` or add a second `matchMedia` listener inside `DrawerSurface`.

---

## Snap points

Snap points let a drawer rest at intermediate heights before full dismissal. Use them only when the feature explicitly benefits from a partially-visible state.

```tsx
// Snap points example — used for drawers with a preview and a full detail view
<Drawer.Root
  open={open}
  onOpenChange={(v) => { if (!v) onClose(); }}
  direction="bottom"
  snapPoints={['280px', '85%']}
  defaultSnapPoint="280px"
  shouldScaleBackground
>
```

**When to use snap points:**

| Use case | Snap points? |
|---|---|
| Feature page in a side drawer (desktop) | No — full height, no snapping |
| Feature page in a mobile bottom sheet | No — open to `max-h-[90dvh]`, drag to dismiss |
| Preview panel that expands to full detail | Yes — two snap points |
| Map detail that peeks at the bottom | Yes — two or three snap points |
| Quick-action confirmation | No — use `ModalSurface` instead |

Do not add snap points to every drawer. The default is no snap points.

---

## Dismissibility

By default `dismissible={true}` — the user can drag the drawer closed. This is the correct default for all feature-page drawers.

Set `dismissible={false}` only when the drawer contains a form that would lose unsaved data on an accidental swipe. In that case, Vaul still renders the drag handle but prevents dismissal. The close button remains the only exit path.

```tsx
<Drawer.Root
  open={open}
  onOpenChange={(v) => { if (!v) onClose(); }}
  direction="bottom"
  dismissible={false}   // ← only for forms with unsaved draft state
>
```

When `dismissible={false}`, show a visible "Cancel" or "Close" button inside the drawer header. Do not leave users with no visible exit.

---

## Scroll locking

Vaul locks the document scroll automatically when a drawer is open. No `overflow: hidden` on `<body>` is needed. Do not apply it manually — double-locking causes scroll-position loss on iOS Safari.

Scroll inside the drawer's content area works independently. The `overflow-y-auto` on the content div inside `DrawerSurface` handles internal scrolling. Vaul does not interfere with scroll within the drawer panel itself.

---

## Focus trapping

Vaul traps focus inside `Drawer.Content` when the drawer is open. The first interactive element in the header (the close button) receives focus on open. Tab cycling stays within the drawer until it is closed.

Do not use `autoFocus` on form fields inside a drawer surface unless the form is the entire purpose of the drawer and there is no header navigation. Autofocusing a form field while the header close button is above it produces a disorienting keyboard experience.

---

## Accessibility

Vaul sets the correct ARIA attributes automatically when used with `Drawer.Content`:

- `role="dialog"` on the panel
- `aria-modal="true"` on the panel
- `aria-labelledby` wired through the `aria-labelledby` prop on `Drawer.Content`

The `id="surface-drawer-title"` on the `<h2>` inside the header matches the `aria-labelledby` prop on `Drawer.Content` — this is how screen readers announce the drawer title when it opens. Keep this wiring intact.

Do not add a second `role="dialog"` or `aria-modal` attribute inside the drawer. Vaul already sets them.

---

## Stacked drawers

When the Surface Manager stacks drawers (a second drawer opens over the first), the `zIndex` prop separates them. Vaul renders each drawer in `Drawer.Portal` (at `document.body`), so `zIndex` is the only separator.

```tsx
// First drawer: zIndex=50, zIndex+1=51
// Second drawer on top: zIndex=60, zIndex+1=61
```

The backdrop of the upper drawer partially covers the lower drawer. The user closes the upper drawer first to interact with the lower one. This matches browser `<dialog>` stacking semantics.

Do not animate the background drawer scaling when a second drawer opens on top. `shouldScaleBackground` applies only to the base page content, not to other open drawers.

---

## What Vaul must NOT do

- **Never import `vaul` outside of `DrawerSurface`.** Vaul is a single-component implementation detail. Feature pages, controllers, the Surface Manager, and other shared components never touch it.
- **Never use Framer Motion for drawer enter/exit or backdrop animation.** Vaul owns that entirely. Removing Framer Motion from `DrawerSurface` is intentional — do not re-add it.
- **Never set `overflow: hidden` on `<body>` manually.** Vaul's scroll lock handles this.
- **Never apply `dismissible={false}` without a visible close affordance.** Users must always have a clear way to exit.
- **Never add `role="dialog"` or `aria-modal` manually inside a drawer.** Vaul sets them on `Drawer.Content`.
- **Never use snap points as a default.** They are an intentional override for specific preview/expand patterns.
- **Never render `Drawer.Handle` on desktop.** The handle is a mobile-only gesture affordance — `useBreakpoint()` controls the conditional render.
- **Never read `direction` from anything other than `BreakpointProvider`.** The app has one source of truth for device breakpoints.
- **Never add `autoFocus` to a form field inside a drawer surface unless the drawer contains only a form** and no header navigation exists above it.
- **Never place the `vaul-drawer-wrapper` div anywhere except the immediate child of `document.body`.** Any nesting breaks the scale transform.
