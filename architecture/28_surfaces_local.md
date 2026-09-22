> Extends: 28_surfaces.md

# 28 — Surface Manager — ManagerBeyo Managers App Extension

## App-specific surface types

This app uses five surface types. The canonical `drawer` type is not registered.

| Type | Component | Direction | URI | Gesture |
|---|---|---|---|---|
| `page` | — (route only) | n/a | Always | n/a |
| `slide` | `SlidePageSurface` | Right-to-left push | Always | Back button |
| `sheet` | `BottomSheetSurface` | Bottom-up | Optional | Vaul drag-dismiss |
| `modal` | `ModalSurface` | Center scale | Optional | Escape / backdrop |
| `rise` | `RiseSurface` | Fade + bottom-up | Optional | Escape |

## `drawer` exclusion

The adaptive `drawer` type (right on desktop, bottom on mobile) is not used.
This app has no desktop sidebar layout. Use `slide` for page-depth navigation.
Use `sheet` for bottom overlays.

## SURFACE_SHELLS map

```ts
const SURFACE_SHELLS = {
  page: ({ children }) => <>{children}</>,
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
  rise: RiseSurface,
};
```

## `rise` behavior

`rise` is a full-viewport overlay that fades in while moving upward and fades
out while moving downward. It participates in the standard surface stack,
history-depth reconciliation, z-index ordering, covered-surface `inert`
behavior, and backdrop rendering. The floor kiosk uses it for device settings
and for future kiosk flow screens over the always-mounted keypad route.

## Close animation contract (Vaul)

`BottomSheetSurface` uses a 350ms delayed close to preserve Vaul's spring exit animation.
When dismissal begins, it first sets `open={false}` so Vaul can animate, then removes the
surface from the stack after the delay.

**A page closes itself through `useSurfaceHeader().requestClose()`**, which is that animated
path. `useSurface().close(id)` removes the entry from the store synchronously — the sheet
unmounts before Vaul can slide it down while the shared backdrop fades on its own timeline, so
the two visibly come apart. Reserve the store `close` for closing *another* surface, or one whose
content is already gone (a detail page reacting to a 404).

**`dismissible: false` blocks user gestures only** — swipe, backdrop tap, Escape and browser Back.
It does not block `requestClose`: a locked sheet's own buttons close it with the same animation
as any other sheet (`BottomSheetSurface.locked-close.test.tsx`).
