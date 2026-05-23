# PLAN_fix_task_flow_timeline_20260523

## Metadata

- Plan ID: `PLAN_fix_task_flow_timeline_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T15:13:20Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal:** Rewrite `TaskFlowTimeline` to display flow records as a vertical dot-and-line timeline, matching the delivery-app tracking pattern — sorted most-recent-first, with the most recent entry highlighted.
- **Business/user intent:** The current list of card-style buttons gives no temporal sense. A vertical rail with dots communicates progression through time at a glance.
- **Non-goals:**
  - No changes to `flowRecords` data fetching or the controller.
  - No changes to `TaskFlowRecordDetailSheetPage`.
  - No new fields added to `TaskFlowRecord`.

## Scope

- In scope:
  - `features/tasks/components/detail/TaskFlowTimeline.tsx` — full rewrite of the interior layout.

- Out of scope: everything else.

- Assumptions:
  - `DashedInfoSection` renders `flex flex-col gap-3 rounded-xl border border-dashed ... px-4 py-4` — confirmed. The gap between the title and the list comes from this.
  - `getFlowActorLabel(record)` returns `record.created_by?.username ?? 'System'` — confirmed.
  - `formatDateTime(value)` returns a locale-formatted medium date + short time string — confirmed.
  - `flowRecords` is `TaskFlowRecord[]`; each record has `entity_client_id`, `created_at`, `description`, `type`, `created_by`.
  - The `isFlowPending` and empty-state branches are preserved unchanged.

## Acceptance criteria

1. Flow records render as a vertical timeline: each entry has a circular dot on the left, a vertical line connecting to the next entry, and text content on the right.
2. Records are ordered most-recent first (descending by `created_at`).
3. The most recent entry has a `bg-primary` dot and `font-semibold text-foreground` text.
4. Older entries have a muted dot (`bg-[color:var(--color-border)]`) and `font-medium text-foreground/75` text.
5. The connecting line between entries is present for all entries except the last.
6. Tapping any entry calls `openFlowRecord(record.entity_client_id)`.
7. Loading and empty states are unchanged.
8. `npm run typecheck` passes with zero errors.

---

## Implementation plan

---

### Step 1 — Rewrite `TaskFlowTimeline.tsx`

Replace the current flat-card list with a vertical rail timeline. The rail uses an explicit flex column for each entry's left side: a dot + a flexible-height line. The `flex` default (stretch alignment) on the row button means the rail column matches the content column height, so the line fills the full space between entries automatically.

```tsx
import { cn } from '@/lib/utils';

import { DashedInfoSection } from '@/components/primitives';
import { formatDateTime, getFlowActorLabel } from '../../lib/task-detail';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskFlowTimeline(): React.JSX.Element {
  const { flowRecords, isFlowPending, openFlowRecord } = useTaskDetailContext();

  const sorted = [...flowRecords].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <DashedInfoSection data-testid="task-detail-flow-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Flow timeline
      </h3>

      {isFlowPending ? (
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flow records yet.</p>
      ) : (
        <div className="flex flex-col">
          {sorted.map((record, index) => {
            const isMostRecent = index === 0;
            const isLast = index === sorted.length - 1;

            return (
              <button
                key={`${record.entity_client_id}-${record.created_at}`}
                type="button"
                className="flex w-full gap-0 text-left"
                onClick={() => openFlowRecord(record.entity_client_id)}
              >
                {/* Rail column: dot + connecting line below it.
                    No items-start on the parent button — default stretch alignment
                    lets this column grow to match the content column height,
                    so flex-1 on the line fills the full gap to the next entry. */}
                <div className="relative mr-3 flex w-4 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      'mt-0.5 h-3 w-3 shrink-0 rounded-full',
                      isMostRecent
                        ? 'bg-primary'
                        : 'bg-[color:var(--color-border)]',
                    )}
                  />
                  {!isLast && (
                    <div className="mt-1 w-px flex-1 bg-[color:var(--color-border)]" />
                  )}
                </div>

                {/* Content */}
                <div className={cn('min-w-0 flex-1', !isLast && 'pb-4')}>
                  <p
                    className={cn(
                      'text-sm',
                      isMostRecent
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-foreground/75',
                    )}
                  >
                    {record.description ?? record.type}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getFlowActorLabel(record)} · {formatDateTime(record.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </DashedInfoSection>
  );
}
```

Key changes from the current file:

| Before | After |
|---|---|
| Flat `gap-2` list of card buttons | Vertical dot-and-rail layout |
| Unsorted (insertion order) | Sorted most-recent-first |
| `ChevronRight` icon on each row | No chevron — dot provides the visual affordance |
| `bg-card` card background per row | Transparent row; rail dots provide structure |
| `"Timeline event"` fallback | `record.type` fallback (more meaningful) |
| `font-medium text-foreground` for all | `font-semibold text-foreground` for most recent; `font-medium text-foreground/75` for older |

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/tasks/components/detail/TaskFlowTimeline.tsx` | Full rewrite — vertical dot-rail timeline |

---

## Risks and mitigations

- **Risk:** The `flex-1` line on the rail column may not stretch if the parent button has explicit `items-start`. The plan intentionally omits `items-start` on the button so the default `stretch` alignment applies, giving the rail column the same height as the content column.
  **Mitigation:** Do not add `items-start` to the button. The content text and `pb-4` on the content div drive the row height; the rail column inherits it via stretch.

- **Risk:** `text-foreground/75` uses Tailwind opacity modifier. If the project's Tailwind config does not enable opacity modifiers on foreground, this class has no effect and falls back to full opacity.
  **Mitigation:** If `text-foreground/75` produces no visible dimming, replace with `text-muted-foreground` for the older-entry text.

- **Risk:** `entity_client_id` is not unique across flow records (multiple records reference the same entity). The `key` uses `${entity_client_id}-${created_at}` — this is unique as long as no two records share the exact same entity ID and timestamp, which is true in practice.
  **Mitigation:** None needed in practice; the composite key is safe.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open a task with flow records → entries appear as a vertical timeline, most recent at top with primary dot, older entries with muted dots, vertical lines connecting them → tapping an entry opens the flow record detail sheet → loading and empty states still render correctly
