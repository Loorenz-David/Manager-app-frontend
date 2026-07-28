# 22 — Builder component kits (presentational layer)

`packages/presentation-builder/src/components/` — the studio's entire visual surface,
built as **props-only presentational kits** (division-of-labor rule: kits were
designed/styled by the builder agent; logic agents wire them and treat their styling
as read-only). No kit component fetches, reads app state, or imports controllers.
They receive data + callbacks and render design-token-faithful UI per
[`../design/`](../design/).

**Visual reference is executable**: every kit has a showcase mounted in the studio at
dev-only routes — `/kit/dashboard`, `/kit/editor`, `/kit/timeline`, `/kit/publish`
(sources in `src/dev/*KitPreview.tsx`). When changing a kit, verify there first; the
showcases double as the styling contract.

## Kits

### `components/dashboard/` — screen 1
`DashboardTopBar`, `DashboardFilterRow`, `AnnouncementCardGrid`, `AnnouncementCard`
(cover `MiniPhoneCover`, `AnnouncementStatusPill`, `MediaStripe`),
`NewAnnouncementCard`, skeleton/empty/error states. `types.ts` defines
`AnnouncementCardData` / `DASHBOARD_FILTERS` — the prop contract the dashboard
controller derives into.

### `components/editor/` — screen 2 frame + canvas
`EditorShell` (grid: rail / canvas / panel / dock; `h-full` — **height chain**: the
studio AppShell owns `h-screen`, shell fills it; breaking this pushed the dock
off-viewport once), `EditorTopBar`, `EditorReadOnlyBanner`, `SlideRail` +
`SlideRailCard`, `EditorCanvas` (phone-shaped stage rendering via the runtime
renderer), `CanvasDraggableBox` (selection/drag box — emits **unclamped center
fractions** via `onDrag`; a selected element receives eight resize handles which
emit raw `onResize({handle, deltaXFraction, deltaYFraction})`, narrowable with the
optional `resizeHandles` subset prop; clamping, minimum size, edge behavior, and
corner aspect locking are logic-side — media aspect-locks its corners, text does
not), `CanvasTextEditOverlay`
(auto-focused, select-all canvas textarea; commits through props). **It styles no
text of its own** — it takes a `textStyle: CSSProperties` computed by the runtime's
`compositionTextStyle` and spreads it verbatim, so the author edits against the
exact wrap they will get; its focus affordance is an `outline`, never a `border`,
which under `border-box` would consume content width and shift every line break,
`MediaUploadOverlay`. The runtime renderer layer is pointer-inert in the editor so
selection and drag gestures belong exclusively to the overlay kit.

### `components/timeline/` — the dock
`TimelineDock`, `TimelineControls` (transport), `TimelineRuler`, `TimelineTrack`
(lanes; `overflow-hidden` so bars can't bleed over the side panel), `TimelineBar`.
`types.ts` holds the **gesture contract**:
`TimelineBar.onGesture({kind: "move" | "resize-start" | "resize-end", deltaPx,
laneWidthPx})` — bars report raw pixels; `timeline-geometry.ts` (doc 21) does all
math. Scrub positions cross the boundary as 0..1 fractions.

### `components/panels/` — right properties panel
`SlidePropertiesPanel`, `TextBlockPanel`, `MediaElementPanel` (fit, read-only
geometry summary, Appears/Disappears transitions, replace/delete), shared
`PanelPrimitives` (`PanelSection`, `PanelSlider` — whose value readout becomes an
editable field when given `onValueLabelCommit`, passing the **raw typed text** up
unparsed so values beyond the handle's range stay possible and parsing stays
logic-side, `SegmentedControl`,
`PanelDeleteButton`, header row with **required `onClose`** — a user-review fix;
don't make it optional), and `TextStylingSection`. The styling section composes the
generic `@beyo/ui` `AlignmentPicker`, `ColorSwatchPicker`, and `SliderFieldRow`
primitives; those primitives have no presentation imports and are demonstrated
standalone in the editor kit preview.

`PanelDrawer` is a controlled, props-only collapsible group: logic supplies
`isOpen` and `onToggle`; the header retains button semantics and exposes
`aria-expanded`, the body animates open/closed, and `errorBadge` surfaces validation
hidden inside a closed drawer. Its stable header selector is
`presentation-panel-drawer-<id>`. Each properties panel accepts the shared optional
`drawers: { open: readonly string[]; onToggle(id): void }` convention. When omitted,
the panel renders its controls flat in the legacy order; consumers must opt in by
wiring controller-owned state. Read-only panels still receive drawer controls so
users can browse their fields.

### `components/preview/` + `components/publish/`
`PreviewOverlay` (phone-framed playback stage). Publish kit: `PublishDialogShell`
(+`PublishDialogSection`), `ChipCheckboxGroup`, `UserPickerList`,
`PublishSettingsFields` (type/category/dismissible/priority),
`SchedulePickers`, `PublishErrorSummary`.

## Upstream / downstream

- **Upstream:** design docs (`../design/`), `@beyo/ui` tokens/primitives.
- **Downstream:** consumed *only* by the assembly seams — `views/DashboardView.tsx`,
  `views/EditorView.tsx`, `publish/PublishDialog.tsx` — and the `src/dev/` showcases.
  Kit prop types are exported from the package index; the controller layer conforms
  to them, not vice versa.

## Rules

1. **Props-only, forever.** New data need → extend props, wire it in the view.
   Never import a hook from `api/`, `actions/`, or `controllers/` into a kit file.
2. **No arithmetic in kits.** Geometry, clamping, time mapping → `lib/` modules.
   Kits emit raw gestures/fractions.
3. Styling intentions route **here** (and to the showcases); behavior intentions
   route to doc 21. If a change needs both, do logic and kit as separate concerns —
   prop contract first.
4. Update the matching `dev/*KitPreview.tsx` showcase when a kit gains a state or
   variant, so the visual contract stays complete.

### Canvas resize gesture contract

`CanvasDraggableBox` owns pointer capture and reports each move relative to the
pointer-down origin. It does not accumulate, clamp, or interpret gestures:
`{handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w",
deltaXFraction, deltaYFraction}`. The assembly seam must capture the element's
base layout for the gesture, pass the raw delta to logic-side
`resizeElementLayout`, and release that base on `onResizeEnd`.
