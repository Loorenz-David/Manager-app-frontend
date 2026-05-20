> Extends: 28_surfaces.md

# 28 — Surface Manager — ManagerBeyo Managers App Extension

## App-specific surface types

This app uses four surface types. The canonical `drawer` type is not registered.

| Type | Component | Direction | URI | Gesture |
|---|---|---|---|---|
| `page` | — (route only) | n/a | Always | n/a |
| `slide` | `SlidePageSurface` | Right-to-left push | Always | Back button |
| `sheet` | `BottomSheetSurface` | Bottom-up | Optional | Vaul drag-dismiss |
| `modal` | `ModalSurface` | Center scale | Optional | Escape / backdrop |

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
};
```

## Close animation contract (Vaul)

`BottomSheetSurface` uses a 350ms delayed close to preserve Vaul's spring exit animation.
When dismissal begins, it first sets `open={false}` so Vaul can animate, then removes the
surface from the stack after the delay.
