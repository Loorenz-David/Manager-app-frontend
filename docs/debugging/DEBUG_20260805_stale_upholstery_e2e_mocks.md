# DEBUG_20260805_stale_upholstery_e2e_mocks

## Status

Partially resolved. `upholstery-swap.spec.ts` is **green on desktop + mobile**.
`upholstery-reorder.spec.ts` (`does not expose reorder controls from picker cards`) is **still red**
and was deliberately left alone — see "Remaining".

Found while runtime-validating `PLAN_item_can_have_upholstery_none_field_20260805`. **None of this was
caused by that plan's changes** — the specs were already red beforehand, for the reasons below.

## Symptom

Every managers-app e2e that opens a task detail failed at the first assertion after the card tap:

```
expect(getByTestId('task-detail-upholstery-section')).toBeVisible()  →  element(s) not found
```

The aria snapshot showed the page still on the tasks list, which reads like "the card click did
nothing" and sends you hunting through `SlideStack` / `PullToRefresh` / surface wiring. That is the
wrong trail.

## Root cause: mock payloads drifted behind the Zod schemas

The route mocks are hand-written task payloads. Every field added to `TaskDetailRawSchema` since a spec
was written silently invalidates that spec's whole payload: `apiClient` does `schema.safeParse` and
throws `ApiRequestError(502, "invalid_response")` on any mismatch, so the detail query errors and the
sections never render. Nothing logs the Zod issue to the console, and the failure surfaces as a missing
element several assertions later.

Fields the mocks were missing, in the order they turned up (each one masked the next):

| Missing field | Shipped with |
|---|---|
| `task.post_handling` | post-handling work |
| `task.assortment` | assortment field |
| `item.item_zone` | item position/zone |
| upholstery `origin` (`UpholsteryPickerOptionSchema`) | external upholstery providers |

The upholstery `origin` gap has its own tell: the field renders `availableupholstery_old` — the
requirement pill plus the raw client id — because the picker-list parse failed, so the field fell back
to showing `value` instead of a resolved name.

### The 60-second way to find this

Do not bisect by adding fields one at a time (four Playwright rounds). Parse the mock against the schema
directly and read every issue at once:

```ts
// throwaway test in packages/tasks/src/
import { TaskDetailRawSchema } from "./types";
const result = TaskDetailRawSchema.safeParse(MOCK);   // MOCK = payload pasted from the spec
console.log(result.success ? "valid" : JSON.stringify(result.error.issues, null, 2));
```

To confirm the app itself is fine before touching mocks at all, run a spec with **no route mocks** that
clicks a card and logs `page.on('pageerror')` plus the testid counts. Real API, real render — if the
section appears there, the bug is in the fixtures, not the app.

## Second cause: two stale UX assumptions

1. **Staged picker save.** The spec expected the picker to close on card tap. Tapping only *stages* a
   choice; the bottom `Save selection` action commits it. Added that click.
2. **`filterTaps` on mobile.** Clicks inside a `PullToRefresh` are swallowed on the touch project — the
   already-documented issue (`worker-timeline.spec.ts` carries the same `press()` helper and comment).
   Copied that helper into both specs for card / field taps.

## Remaining

`upholstery-reorder.spec.ts` still times out inside `openUpholsteryPicker`, on both projects, after all
of the above. It gets further than before (payload now validates) but never reaches the picker. Likely
its own fixture drift — its list-route mock (`primary_item` on `TaskListItemRawSchema`) and its
`tasks-card-body-${taskId}` lookup depend on the mocked task actually appearing in the list. Not chased;
it tests reorder affordances, not this feature. See also
`DEBUG_PLAN_31_upholstery_reorder_drag_unresolved_20260527.md`, which is about the same spec's drag
behavior.

## Prevention

These payloads should be built from a shared fixture factory rather than copy-pasted per spec, so a
schema addition breaks one file and not silently every task-detail e2e. Worth doing the next time a
third spec needs the same mock.
