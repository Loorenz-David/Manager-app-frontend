Worker Linear Timeline Calendar

1. Objective

Create a reusable worker timeline calendar page that allows ADMIN and MANAGER users to inspect how a worker spent their time across a selected date or date range.

The page must use the worker linear timeline drill-down endpoint:

GET /api/v1/worker-stats/{user_id}/linear-timeline

Backend handoff:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_linear_timeline_20260719.md

The timeline must visualize a worker’s activity as calendar events positioned against the actual time of day.

The interface and interaction model should be inspired by the Google Calendar mobile day view shown in the provided screenshot, while continuing to use the ManagerBeyo design system and existing frontend primitives.

The timeline should make it easy for a manager to understand:

- when the worker was actively working;
- which task, item, or working section was involved;
- when the worker was paused;
- why the worker was paused;
- when the worker had explicitly ended their shift;
- when the worker was idle without a valid active state;
- when a working record transitioned to completed;
- which activity is currently open and still running.

The first implementation is focused on historical worker activity. However, the calendar grid and event-layout architecture must remain reusable for future scheduled events.

⸻

2. Phase 1 scope

Phase 1 includes:

- creation of the worker timeline page;
- reusable timeline calendar components;
- a vertically scrollable 24-hour calendar grid;
- single-day and three-day views;
- horizontal navigation between dates;
- five-day timeline data preloading;
- date-picker navigation;
- rendering backend timeline segments;
- rendering working, paused, ended-shift, and idle events;
- rendering completion transition markers;
- navigation from actionable events to task details;
- current-time indication;
- support for open/running events;
- loading, empty, error, and truncated-response states;
- mobile gestures with accessible non-gesture alternatives.

Phase 1 does not include:

- creating or editing calendar events;
- scheduling future worker activity;
- changing worker state from this page;
- rendering a complete multi-lane Gantt chart of every underlying step;
- reconciling timeline pause totals against cumulative /worker-stats/totals values;
- loading task or item images as part of the timeline request;
- server-side pagination of timeline segments.

⸻

3. Page and component location

Create the reusable timeline components under:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/components/time-line-calendar

The implementation must follow strong separation of concerns and the Single Responsibility Principle.

The page-level component should coordinate:

- the selected worker;
- the parent-provided initial date or range;
- the internally controlled visible dates;
- the loaded five-day data window;
- API request state;
- single-day or three-day view mode;
- horizontal date navigation;
- opening task details;
- closing or navigating back from the page surface.

Reusable calendar components should focus on presentation, layout, and local interactions. They should not directly own unrelated application state or duplicate API logic.

Claude should inspect the existing stats package before deciding the final component names and file structure.

Expected responsibility areas include:

- timeline page or controller;
- endpoint query hook;
- response adapter;
- timeline window cache;
- visible-date controller;
- calendar header;
- date-picker controller;
- view-mode selector;
- hour-label gutter;
- day-column grid;
- segment geometry calculator;
- segment renderer;
- state-specific event components;
- completion marker;
- current-time indicator;
- multi-record event detail chooser;
- floating close and back controls.

⸻

4. Parent component contract

The timeline page must allow its parent to provide:

type WorkerTimelinePageProps = {
userId: string;
initialDate?: string;
initialDateFrom?: string;
initialDateTo?: string;
onClose: () => void;
onBack?: () => void;
};

The final prop names should follow existing project conventions.

The parent-provided date or range is an initial navigation anchor only.

It must not permanently restrict:

- the dates the user can navigate to;
- the five-day API request width;
- switching between one-day and three-day modes.

After initialization, the timeline page owns its visible-date state.

The page should support opening with:

- one selected date; or
- a selected range from an existing stats page.

When both an initial start and end date are provided, the page should select a reasonable initial visible date from that range while still using the timeline’s own one-day or three-day view rules.

⸻

5. Backend endpoint contract

Request

GET /api/v1/worker-stats/{user_id}/linear-timeline?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

Authentication

The endpoint requires an authenticated user with one of these roles:

ADMIN
MANAGER

Path parameter

Parameter Type Description
user_id string Client ID of the worker whose timeline will be loaded.

Query parameters

Parameter Required Description
date_from No Inclusive UTC calendar date in YYYY-MM-DD format. Defaults to the current server UTC date.
date_to No Inclusive UTC calendar date in YYYY-MM-DD format. Defaults to the current server UTC date.

Validation rules:

- both values must be valid YYYY-MM-DD dates;
- date_to cannot be earlier than date_from;
- the requested range cannot exceed 366 days;
- invalid values return 422;
- the drill-down endpoint does not support limit or offset.

The frontend normally requests five calendar dates at a time.

Moving the five-day request window is the timeline’s pagination mechanism.

⸻

6. Endpoint response shape

type WorkerLinearTimelineResponse = {
user: WorkerLinearTimelineUser;
timeline: WorkerLinearTimelineTotals;
segments: WorkerLinearTimelineSegment[];
segments_truncated: boolean;
};

User shape

type WorkerLinearTimelineUser = {
client_id: string;
username: string;
profile_picture: string | null;
last_online: string | null;
};

Example:

{
"client_id": "usr_01ABC",
"username": "Worker Name",
"profile_picture": null,
"last_online": "2026-07-19T14:32:00+00:00"
}

Timeline totals shape

type WorkerLinearTimelineTotals = {
date_from: string;
date_to: string;
working_seconds: number;
pause_seconds: number;
ended_shift_seconds: number;
idle_seconds: number;
completed_count: number;
pause_by_reason: Record<string, number>;
};

Example:

{
"date_from": "2026-07-15",
"date_to": "2026-07-19",
"working_seconds": 21600,
"pause_seconds": 3600,
"ended_shift_seconds": 1800,
"idle_seconds": 2400,
"completed_count": 8,
"pause_by_reason": {
"pause_lunch_break": 1800,
"pause_meeting": 1200,
"waiting_for_upholstery": 600
}
}

Timeline total semantics

The following four values represent mutually exclusive wall-clock states:

working_seconds
pause_seconds
ended_shift_seconds
idle_seconds

They represent real elapsed time, not cumulative durations across several task records.

Important behavior:

- parallel working records do not double-count elapsed time;
- working takes precedence over every other state;
- paused time is counted only when no working record is active;
- ended-shift time is counted only when neither working nor an active pause applies;
- idle time represents time attributed to none of the other effective states;
- completed_count is a count and must not be included in duration totals;
- pause_by_reason must sum exactly to pause_seconds;
- pause reason keys form an open set and may be extended by the backend.

Known reason values currently include:

"pause_lunch_break"
"pause_coffee_break"
"pause_meeting"
"pause_case_created"
"pause_other_task_priority"
"pause_ended_shift"
"waiting_for_upholstery"
"unspecified"

The frontend must handle unknown reason strings safely and display a generic human-readable fallback.

The frontend must not compare pause_seconds to total_pause_seconds from /worker-stats/totals. They intentionally measure different concepts.

⸻

7. Timeline segment shape

type WorkerLinearTimelineSegment = {
start: string;
end: string;
seconds: number;
state:
| "working"
| "paused"
| "ended_shift"
| "idle";
reason: string | null;
is_open: boolean;
steps: WorkerLinearTimelineStepRecord[];
};

Example:

{
"start": "2026-07-15T09:00:00+00:00",
"end": "2026-07-15T09:30:00+00:00",
"seconds": 1800,
"state": "paused",
"reason": "pause_lunch_break",
"is_open": false,
"steps": []
}

Segment guarantees

The backend guarantees that segments are:

- ordered by start;
- non-overlapping;
- contiguous within the worker’s active span;
- represented by one effective state;
- merged when adjacent segments have the same effective state;
- merged for paused events only when both state and effective reason match;
- split at UTC midnight;
- reconciled with the timeline totals;
- empty in steps when their state is idle.

The frontend must use start and end as the authoritative values for event geometry.

seconds may be used for:

- duration labels;
- response validation;
- display formatting.

The frontend must not reconstruct the effective timeline from steps.

Open segments

is_open: true

means that the segment is currently active and its effective end reaches the backend’s current time.

Open segments should:

- have a live visual treatment;
- continue visually toward the current-time position;
- update their visible duration locally while the page remains open;
- eventually be refreshed from the backend to avoid permanently relying on client-side extrapolation.

The implementation plan should define a conservative refresh strategy for ranges containing today.

Truncated segments

segments_truncated: true

means that the response exceeded the backend’s 5000-segment safety limit.

When this happens:

- do not silently render a partial timeline as complete;
- show a clear warning or error state;
- retry with a narrower date window where appropriate;
- prevent an infinite retry loop;
- retain enough context for the user to select a smaller date range.

Normal five-day requests should not reach this limit.

⸻

8. Segment step-record shape

type WorkerLinearTimelineStepRecord = {
record_id: string;
step_id: string;
task_id: string;
working_section_id: string | null;
working_section_name: string | null;
item: {
client_id: string;
article_number: string | null;
sku: string | null;
} | null;
state: string;
reason: string | null;
entered_at: string;
exited_at: string | null;
is_open: boolean;
ended_by:
| "completed"
| "paused"
| "working"
| "ended_shift"
| "skipped"
| "failed"
| "cancelled"
| "blocked"
| "still_open"
| "unknown"
| string;
};

Example:

{
"record_id": "ssr_01ABC",
"step_id": "tsp_01ABC",
"task_id": "tsk_01ABC",
"working_section_id": "wsec_01ABC",
"working_section_name": "Upholstery",
"item": {
"client_id": "itm_01ABC",
"article_number": "ART-100",
"sku": "SKU-100"
},
"state": "working",
"reason": null,
"entered_at": "2026-07-15T09:30:00+00:00",
"exited_at": "2026-07-15T10:15:00+00:00",
"is_open": false,
"ended_by": "completed"
}

Step-record semantics

One entry in steps represents one underlying StepStateRecord.

It does not necessarily represent one unique task or one unique task step.

Important behavior:

- a working segment can contain several working records during batch or parallel work;
- a paused segment can contain several paused records;
- every paused record keeps its own reason;
- the segment-level reason is the effective reason that owns the wall-clock block;
- a record’s entered_at and exited_at are its true database span;
- record times can extend outside the segment or requested API window;
- the frontend must clip record spans when positioning them inside the selected segment;
- exited_at is null for open records;
- ended_by: "completed" means the working record transitioned to completed at exited_at;
- completed is a transition, not a standalone segment state;
- ended_by must be handled as an open set because the backend may add values.

The segment itself remains the main drawable calendar event.

The records inside steps provide:

- labels;
- navigation context;
- batch-work information;
- completion transitions;
- detailed event information.

They must not be converted into overlapping top-level calendar events in Phase 1.

⸻

9. Backend state precedence

The backend has already resolved overlapping state records using this precedence:

1. working
2. paused
3. ended_shift
4. idle

For example, when one item is being worked while another item is paused, the segment state will be:

"working"

The frontend must render the provided effective state and must not independently recalculate precedence.

⸻

10. Timeline display timezone

The backend:

- returns absolute ISO-8601 UTC timestamps;
- uses UTC dates for date_from and date_to;
- splits segments at UTC midnight.

The frontend must establish one explicit and consistent display-timezone policy.

The preferred user experience is to render the timeline in the user’s local timezone, but Claude must inspect existing worker-stats and application date conventions before finalizing this decision.

The implementation must not mix:

- UTC date headers;
- local-time event positions;
- a local current-time line;
- UTC request dates;

without a clearly defined conversion layer.

When using local-time rendering:

- parse start and end as absolute timestamps;
- convert them to the selected display timezone;
- calculate their local day column and minute position;
- visually split or clip a backend segment if it crosses a local midnight;
- preserve the original backend segment and record data;
- derive API request dates according to the backend’s UTC-date contract;
- handle daylight-saving transitions without assuming every day contains exactly 24 local hours.

The response adapter should centralize these conversions so event components do not each implement timezone logic.

⸻

11. Calendar views

The calendar supports two presentation modes.

Single-day mode

Single-day mode:

- displays one date column;
- provides the widest event layout;
- shows the greatest amount of event detail;
- displays the current-time line when viewing today;
- allows richer labels for tasks, articles, reasons, and durations.

Three-day mode

Three-day mode:

- displays three adjacent date columns;
- uses compact event content;
- preserves meaningful state, duration, and item identification;
- reduces secondary event detail to fit narrower columns.

The calendar must not show more than three day columns at once during Phase 1.

The segment positioning model must be shared between both modes.

Only the presentation density should change.

⸻

12. Date header

Each visible date column must have a corresponding date header.

The date header includes:

- abbreviated weekday;
- numeric day of month;
- current-date indication;
- optional selected or focused-date indication.

The current date must use a circular pill with:

bg-primary

The header must remain aligned with:

- the corresponding timeline day column;
- the hour-label gutter;
- horizontal date navigation.

When the calendar body scrolls vertically, the date header should remain available according to the established page or sticky-header conventions.

⸻

13. Twenty-four-hour grid

Each visible day column represents a complete calendar day.

Required boundaries:

00:00
through
next-day 00:00

The grid must include:

- one horizontal division for every hour;
- consistent vertical scale between visible dates;
- minute-level event positioning;
- a visible left-side hour-label gutter;
- vertical scrolling through the complete day.

Event geometry must correctly represent:

- events beginning between hour lines;
- events ending between hour lines;
- short events;
- multi-hour events;
- midnight boundaries;
- open events reaching the effective current time.

The plan should define:

- pixels per minute or pixels per hour;
- minimum event interaction height;
- behavior for events too short to display full text;
- whether the initial scroll position targets the first meaningful segment or a standard workday hour;
- how the scroll position is retained when switching between one-day and three-day modes.

⸻

14. Horizontal date navigation

The user must be able to navigate dates horizontally using swipe or drag interactions.

Expected behavior:

- swiping toward older dates reveals previous dates;
- swiping toward newer dates reveals following dates;
- Phase 1 must not navigate beyond the user’s current date;
- navigation should remain smooth while using already-loaded data;
- horizontal gestures must not interfere with vertical scrolling;
- future-date clamping must be isolated so it can later be removed for scheduling support.

The implementation plan should define a reliable gesture threshold rather than changing dates on minor horizontal movement.

Mouse and trackpad users must also have usable navigation controls, such as previous and next date buttons or equivalent existing controls.

⸻

15. Five-day request window

The timeline visually renders one or three dates but normally loads five dates from the endpoint.

This provides data on both sides of the visible range and reduces API requests during horizontal navigation.

Example five-day window:

loaded:
July 13
July 14
July 15
July 16
July 17
visible in three-day mode:
July 14
July 15
July 16

The implementation plan must define a deterministic window rule.

A recommended approach is:

Single-day mode

For visible date D, request:

D - 2 days
through
D + 2 days

Clamp the upper boundary to the current date.

When upper clamping reduces the range, shift the lower boundary backwards so that the request still contains five dates where possible.

Three-day mode

For visible range:

D
D + 1
D + 2

request a five-day range containing one additional date before and after:

D - 1
through
D + 3

Apply the same current-date clamping behavior.

Window movement

When the user approaches an unloaded date:

- request the next appropriate five-day range;
- avoid blocking navigation where cached data is already available;
- preserve existing segments during request transitions where possible;
- avoid duplicate requests for the same worker and range;
- prevent stale responses from replacing newer visible data.

The implementation plan must define:

- query keys;
- request deduplication;
- stale-response protection;
- whether windows are retained separately or merged into a normalized per-date cache;
- cache invalidation when the worker changes;
- prefetch behavior near either edge;
- loading indicators during background window movement.

The parent-provided range does not define the request width. It only identifies the initial date context.

⸻

16. Date-picker behavior

The header must display a tappable date or date-range pill.

Tapping the pill opens the existing reusable calendar/date-picker surface, or the closest appropriate date-selection primitive already present in the project.

The date picker must include view-selection controls for:

- single date;
- three-date range.

Single-date selection

When single-date mode is selected:

- tapping a date sets that date as the visible date;
- the calendar switches to single-day mode;
- the selected date becomes the navigation anchor.

Three-date range selection

When three-day mode is selected and the user taps date D, the visible range becomes:

D - 2 days
D - 1 day
D

The selected date is therefore the final and newest date in the range.

Selecting another date repeats the same calculation.

The date picker must not allow selection after the current user date in Phase 1.

When today is selected in three-day mode, the range should show:

today - 2 days
today - 1 day
today

⸻

17. Pinch zoom and view switching

The calendar should support a mobile-calendar-style pinch interaction.

Expected mapping:

- zooming out switches from single-day mode to three-day mode;
- zooming in switches from three-day mode to single-day mode.

The exact physical pinch direction must be validated against the intended Google Calendar behavior during implementation.

Requirements:

- changing modes must preserve the date currently under focus;
- changing modes should preserve the approximate vertical time position;
- gesture handling must not interfere with ordinary vertical scrolling;
- gesture handling must not accidentally trigger horizontal navigation;
- no new gesture dependency should be added before inspecting existing project utilities.

A non-gesture alternative is mandatory.

The date-picker’s single-date and three-date controls can provide this fallback for:

- mouse users;
- keyboard users;
- devices without dependable pinch support;
- accessibility use cases.

⸻

18. Event states

The backend segment states are:

"working"
"paused"
"ended_shift"
"idle"

Create reusable event components or visual variants for each state.

Completed is not a backend segment state.

Completed must be rendered as a transition marker associated with a working record where:

ended_by === "completed"

⸻

19. Working event

Visual treatment

Use a light blue visual treatment similar to the supplied calendar reference.

The event must remain visually distinct from:

- paused;
- ended shift;
- idle.

Open working segments should have a live visual indication, such as a subtle animated or striped treatment, without reducing text readability.

Content priority

The working event should select visible content using this priority:

1. article number;
2. SKU;
3. working-section name;
4. generic localized working label.

In single-day mode, show where space permits:

- primary item identity;
- working-section name;
- duration;
- number of contributing records when greater than one;
- open/live status.

In three-day mode, prioritize:

- primary item identity;
- compact duration;
- contributing-record count when meaningful.

Multiple records

When steps.length > 1, do not imply that only one record was involved.

Use an indicator such as:

+2
3 items
3 records

The exact wording should follow existing application terminology.

The implementation plan must define how the primary record is selected for the visible event label.

A deterministic order should be used, such as:

- earliest clipped record start;
- then stable record ID as a tiebreaker.

All contributing records must remain accessible through the event detail interaction.

⸻

20. Paused event

Visual treatment

Use a light yellow or amber visual treatment.

The paused event must be visually distinct from the working event.

Content

Display:

- formatted pause reason;
- event duration;
- contributing-record count when more than one paused record is present;
- open/live state when applicable.

Pause reason labels should be mapped centrally.

Example mappings:

pause_lunch_break -> Lunch break
pause_coffee_break -> Coffee break
pause_meeting -> Meeting
pause_case_created -> Case created
pause_other_task_priority -> Other task priority
pause_ended_shift -> Ended shift
waiting_for_upholstery -> Waiting for upholstery
unspecified -> Pause

Unknown values should be transformed into a readable fallback where practical.

For example:

waiting_for_material

can become:

Waiting for material

Do not allow unknown values to cause a render error.

When several pause records contribute:

- the segment-level reason remains the main event label;
- each record’s own reason must remain visible in the event detail surface.

⸻

21. Idle event

Visual treatment

Use a neutral gray striped treatment.

The event represents a time period where the backend found no effective:

- working state;
- active pause;
- ended-shift state.

Idle time is meaningful management information and should not be hidden as empty whitespace.

Content

Where space permits, display:

- Idle;
- duration.

Idle events:

- contain steps: [];
- must not navigate to a task;
- may open a lightweight explanatory detail surface, but this is optional for Phase 1.

The striped treatment must also be distinguishable from the live/open treatment used by other states.

⸻

22. Ended-shift event

The backend provides ended_shift as a separate effective state.

It must not be merged visually with idle.

Visual treatment

Use a neutral state that is visually distinct from the idle striped event.

It should communicate that the worker explicitly ended their shift rather than simply becoming inactive.

Content

Display:

- Shift ended or the project’s preferred equivalent;
- duration;
- contributing information when records are available.

If the segment includes actionable task records, the user may inspect them through the same multi-record detail interaction.

Do not assume every ended-shift segment contains an actionable task.

⸻

23. Completion markers

Completed is a transition from a working record and not a full calendar segment.

A completion marker should be rendered when a working segment contains one or more records with:

ended_by === "completed"

The completion time comes from:

exited_at

The visual intent is a compact completed pill or marker positioned at the lower boundary or appropriate timestamp within the working event.

The marker should not change the working event’s duration.

When multiple records complete inside one working segment, the implementation should preserve all completion information.

Preferred behavior:

- show individual small completion markers when their positions remain readable;
- group markers occurring at nearly the same vertical location;
- show a count such as 3 completed when several markers would overlap;
- expose all completed records in the event detail surface.

Completion positions must be clipped to the visible working segment.

A record whose completion timestamp lies outside the segment should not be rendered outside the event bounds.

⸻

24. Event geometry and overlap capability

The current backend returns a linear, non-overlapping partition.

Therefore, Phase 1 normally renders one effective segment at each moment.

However, the event-layout system must be structured so future scheduled events can overlap in the same day column.

Current geometry rules:

- event top position derives from its start minute within the display day;
- event height derives from the difference between start and end;
- events occupy the available width of the day column;
- event geometry is calculated outside the visual state component;
- one-day and three-day modes use the same geometry model;
- event components only change their information density.

Do not create fake top-level overlaps from steps.

steps represent records contributing to the effective segment and belong inside the event’s detail model.

Short events must remain selectable.

Use a minimum interaction target without falsifying their visual duration. This can be achieved by separating:

- the exact visual height;
- the hit target or interaction overlay.

⸻

25. Event interaction

Tapping or clicking an actionable event must provide access to the relevant task detail page:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskDetailSlidePage.tsx

Claude must inspect how TaskDetailSlidePage is opened elsewhere and reuse the established slide-page or routing pattern.

Single actionable record

When an event has exactly one actionable step record with a valid task_id:

- it may open that task directly.

Multiple records

When an event has multiple contributing records:

- do not arbitrarily navigate to the first task;
- open a compact event-detail or record-selection surface;
- list the contributing records;
- allow the user to choose the intended task.

Each record row should display where available:

- article number;
- SKU fallback;
- working-section name;
- record state;
- pause reason when applicable;
- entered time;
- exited time or live status;
- completion transition;
- task identity where useful.

Record spans used for timeline visualization must be clipped to the segment.

The detail surface may still show the original true timestamps.

Duplicate task records

Several state records may point to the same task_id.

The implementation plan must define whether the detail surface:

- groups records by task; or
- lists records individually while visually grouping matching task IDs.

The user must still be able to understand why several records were included.

Idle interaction

Idle events are not task-actionable and must not open TaskDetailSlidePage.

⸻

26. Current-time indicator

When the calendar is in single-day mode and the visible date is today in the chosen display timezone, render a horizontal current-time line.

The indicator includes:

- a horizontal line;
- an HH:mm label;
- minute-accurate vertical positioning.

Requirements:

- it must update as time passes;
- it must disappear for historical dates;
- it must use the same timezone and minute scale as the calendar events;
- it must remain aligned with the selected day column;
- it must not extend across floating controls or unrelated page regions.

The current-time indicator is primarily required in single-day mode.

Claude may evaluate whether a reduced indicator is useful in three-day mode, but this is not required for Phase 1.

⸻

27. Header

The page header must contain:

- worker avatar;
- worker username;
- visible date or visible date range;
- tappable date/date-range pill;
- any required loading or stale-data indication.

Use the avatar primitive from:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/avatar

Date label examples:

Single day:

Sun, 19 Jul

Three days:

17–19 Jul

Cross-month range:

30 Jul–1 Aug

The exact formatting must use the existing application date utilities and locale conventions.

The header should remain compact and appropriate for a mobile slide-page surface.

⸻

28. Floating close and back controls

Add an absolutely positioned floating control container with close and optional back actions.

Reference the established behavior in:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskDetailSlidePage.tsx

Use the existing scroll-visibility primitive:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/scroll-visibility

Expected behavior:

- controls hide during active vertical scrolling;
- controls reappear after scrolling slows or stops;
- controls reappear near the bottom of the scrollable timeline;
- the timeline includes enough bottom padding to prevent the final hours or events from being covered;
- hiding controls must not affect the calendar’s layout geometry;
- back behavior should only appear when meaningful in the host navigation context;
- close behavior dismisses the timeline surface.

The implementation should use relative scroll-visibility behavior consistent with TaskDetailSlidePage.

⸻

29. Loading behavior

The page must distinguish between:

Initial loading

The first requested window has not loaded.

Display:

- worker header skeleton or stable placeholder;
- timeline grid skeleton;
- no misleading empty-state message.

Background window loading

A new five-day window is loading while previously loaded dates remain available.

Behavior:

- retain rendered data;
- show a subtle loading indication;
- avoid replacing the complete timeline with a full-page spinner;
- disable only interactions that would produce inconsistent state, if necessary.

Live refresh

When the range includes today and contains an open event:

- preserve the existing timeline while refreshing;
- avoid visual jumps where practical;
- reconcile replaced segment IDs or geometry using stable response identifiers where available.

⸻

30. Empty state

A valid response may contain:

segments: []

The page must render a deliberate empty state rather than a blank calendar.

The empty state should communicate that no worker timeline activity was recorded for the selected date or range.

The calendar grid may remain visible so the user retains time-of-day context.

Do not create artificial all-day idle events unless the backend explicitly returns idle segments.

The backend only partitions the worker’s active span, so absence of segments does not automatically mean that the entire day should be rendered as backend-confirmed idle time.

⸻

31. Error states

Handle:

401 or 403

The authenticated user does not have access.

Follow the existing application authorization-error behavior.

404

The worker does not exist or is no longer available.

Display a worker-not-found state and allow the user to close or navigate back.

422

The date range is invalid.

The frontend should prevent invalid requests through its own date controller, but still handle the backend response.

Network or server error

Display a retry action while preserving the selected worker and date context.

Truncated response

When segments_truncated is true:

- inform the user that the selected timeline range is too detailed;
- narrow the requested range;
- do not represent the partial response as complete.

⸻

32. Accessibility and non-touch interaction

The timeline must not depend only on touch gestures.

Provide accessible controls for:

- previous date or range;
- next date or range;
- opening the date picker;
- switching between one-day and three-day modes;
- selecting an event;
- selecting a contributing record;
- closing and navigating back.

Requirements:

- actionable event blocks must be keyboard focusable;
- event labels must include meaningful accessible names;
- colors must not be the only indication of state;
- current state should also be represented by text, pattern, icon, or accessible description;
- short events must retain usable interaction targets;
- horizontal and vertical scrolling must remain keyboard and trackpad compatible;
- unknown pause reasons must still produce meaningful accessible labels.

⸻

33. Responsive behavior

The calendar is primarily designed for mobile and narrow slide-page surfaces.

It must also remain usable on larger desktop widths.

Requirements:

- one-day mode should use available width without becoming unnecessarily stretched;
- three-day mode must preserve readable column boundaries;
- hour labels must not consume excessive horizontal space;
- event labels must truncate safely;
- detailed information should move to the event detail surface when the event block cannot contain it;
- no page-level horizontal overflow should be introduced accidentally;
- gesture navigation must have desktop button alternatives.

⸻

34. Data adapters and domain mapping

Create a frontend adapter between the endpoint response and the calendar rendering model.

The adapter should centralize:

- ISO timestamp parsing;
- timezone conversion;
- local-day grouping;
- segment clipping;
- display duration calculation;
- open-event effective end calculation;
- state label mapping;
- pause reason label mapping;
- primary event label selection;
- actionable-record extraction;
- completion-marker extraction;
- segment splitting for local display-day boundaries;
- stable render keys.

The API response types should remain separate from calendar view models.

Example conceptual distinction:

WorkerLinearTimelineSegment

is the backend contract.

CalendarTimelineEvent

is a frontend display model derived from the backend contract.

The implementation plan must not place all transformation logic directly inside React render functions.

⸻

35. Performance expectations

The page should remain responsive for a normal five-day response.

The plan should account for:

- avoiding repeated geometry calculations during every render;
- memoizing derived date columns and event layouts;
- avoiding one global timer per open event;
- using one shared current-time clock where possible;
- preventing duplicate endpoint requests;
- preserving already-loaded date windows;
- limiting expensive gesture-state updates;
- avoiding unnecessary rendering of off-screen date columns.

Virtualization is not automatically required because the timeline has a bounded 24-hour vertical grid and a maximum of three visible columns.

Claude should only introduce virtualization if codebase inspection shows it is necessary.

⸻

36. Testing expectations

The implementation plan must include tests for the following.

Response mapping

- valid working segment;
- valid paused segment;
- idle segment with empty steps;
- ended-shift segment;
- unknown pause reason;
- unknown ended_by value;
- missing item;
- missing article number with SKU fallback;
- missing item and working-section fallback;
- open record with exited_at: null;
- truncated response.

Geometry

- whole-hour event;
- partial-hour event;
- multi-hour event;
- very short event;
- UTC midnight split;
- local midnight crossing after timezone conversion;
- event clipping to visible date;
- open segment ending at effective current time;
- completion marker positioned at exited_at.

Navigation

- initial parent date;
- single-day navigation;
- three-day navigation;
- current-date upper clamp;
- five-day window transition;
- rapid navigation with stale response protection;
- date-picker mode switching;
- three-day range ending on selected date;
- switching between one-day and three-day modes.

Interaction

- one-record event opens task detail;
- multi-record event opens record chooser;
- idle event does not open a task;
- duplicate task records behave predictably;
- completion details remain accessible;
- floating controls hide and reappear correctly.

Totals validation

Where useful in development or tests, verify:

sum(segment.seconds where state === "working")
=== timeline.working_seconds

Equivalent checks should apply for:

- paused;
- ended shift;
- idle.

Also verify:

sum(Object.values(timeline.pause_by_reason))
=== timeline.pause_seconds

Do not block production rendering solely because of minor unexpected backend reconciliation differences. Log or report contract deviations according to existing frontend observability conventions.

⸻

37. Architectural constraints

Use the frontend contracts guide:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md

The implementation must align with its architectural principles.

In particular:

- endpoint response types must be explicit;
- API orchestration must remain outside visual components;
- backend contracts must not be silently reinterpreted;
- page-level goals must map to clear frontend contracts;
- component responsibilities must remain narrow;
- state ownership must be clearly documented;
- derived presentation state should not be persisted unnecessarily;
- task navigation should reuse existing application contracts;
- shared primitives should be reused before introducing alternatives.

⸻

38. Codebase references

Backend handoff:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_linear_timeline_20260719.md

Timeline component destination:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/components/time-line-calendar

Task detail page:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/tasks/src/pages/TaskDetailSlidePage.tsx

Avatar primitive:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/avatar

Scroll visibility:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/scroll-visibility

Implementation-plan template:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md

Frontend contracts guide:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md

⸻

39. Required implementation-planning output

Using this intention as the source of truth, inspect the relevant frontend code and create a detailed implementation plan.

The implementation plan must use:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/TEMPLATE_PLAN.md

The plan must also use:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md

to align the implementation with the project’s frontend architecture.

Before writing the plan, inspect at minimum:

- the existing stats package structure;
- worker-stats API clients and query hooks;
- existing date-range state management;
- TaskDetailSlidePage;
- existing slide-page navigation patterns;
- avatar usage;
- scroll-visibility behavior;
- available date-picker components;
- available gesture utilities;
- existing loading, empty, and error-state patterns;
- existing query caching conventions;
- timezone and date-formatting utilities.

The implementation plan must clearly document:

1. the proposed files to create;
2. the existing files to modify;
3. each component’s responsibility;
4. page and component state ownership;
5. endpoint response types;
6. API query and five-day caching strategy;
7. timezone conversion strategy;
8. segment-to-event adaptation;
9. event geometry calculations;
10. one-day and three-day navigation;
11. gesture and non-gesture controls;
12. event detail and task navigation behavior;
13. floating control behavior;
14. loading, error, empty, and truncated states;
15. accessibility requirements;
16. tests and validation;
17. implementation order;
18. risks, assumptions, and unresolved codebase-dependent decisions.

Do not implement the feature yet.

Produce the implementation plan for review before any code changes are made.
