# Clock In / Out Kiosk — Design Spec

Design file: `Clock Kiosk.dc.html` (single self-contained prototype, fully clickable).

## Purpose

A shared-device terminal where warehouse / production staff enter a 4-digit code to start or end a shift. No personal login, no keyboard — one hand, gloves on, a few seconds per person.

## Screens (4 states, one flow)

1. **Keypad** — persistent header (logo + terminal ID, live clock + date), "Start your shift", 4 code cells, 3×4 keypad (0–9, delete, submit), "Forgot your code?" help.
2. **Identity confirm** — staff photo, name, role, badge no. A context row (today's shift if clocked out, clock-in time if clocked in) and one primary action: **Clock in** (green) or **Clock out** (accent). "Not you? Go back" escape.
3. **Clocked in** — check mark, `Good morning, {first name}`, large timestamp on a dark plate with scheduled hours, then today's floor announcements. Auto-returns to the keypad after N seconds (tweakable, default 12) with a manual Done.
4. **Clocked out summary** — dark hero with hours worked + in/out times; horizontal carousel of items completed with product images; this-week daily-hours bar chart against the 40h target; units/hour vs 5-day average; three factual insight rows with signed deltas.

## Behaviour

- Code is validated on the 4th digit (or submit). Unknown code → inline error + shake + clear; the code never leaves the field.
- The code determines the action: the system knows whether that person is currently in or out, so the confirm screen offers exactly one button.
- No break handling in this version (leave room in the confirm/summary layouts for it later).
- Every state returns to the keypad — the terminal must never be left on a personal screen. Auto-return on the confirmation screens is the safety net.
- Demo codes in the prototype: `4271` (clocked out → clock in), `8306` (clocked in → clock out). All other data is placeholder.

## Visual system

- **Surface:** warm paper `#FAF8F4` on a `#F2EFE9` fill; cards white with a very soft shadow. Dark plates `#1E1B17` reserved for the single most important number on a screen.
- **Text:** ink `#1E1B17`, secondary `#8B8377`, tertiary `#A29A8E`.
- **Accent:** one configurable accent (default burnt orange `#C8632B`, currently previewing blue `#2F5D9E`) used for the submit key, the clock-out action, today's bar, and the final button. Success green `#2E6A44` for clock-in and positive deltas. Error `#C0492E`. Nothing else adds colour.
- **Type:** Instrument Sans for UI copy; IBM Plex Mono for all times, counts, and deltas — numbers should always read as data.
- **Shape:** 99px circles for keys and avatars, 18–28px radii for cards, generous whitespace.
- **Touch:** keypad keys 128px, primary buttons 86–96px tall. Nothing interactive below 44px on any breakpoint.

## Responsive intent

The prototype is drawn at iPad portrait 834×1194. It is a centred single column with a header, a flexible middle, and a bottom-pinned action — that structure carries across devices:

- **iPad (primary):** as designed. Portrait preferred; in landscape keep the column at ~700px max-width and centre it.
- **Desktop / PC:** same column, centred on the page background; cap it around 720px. Keypad stays (touch monitors are common on the floor) but physical number-key input should also work.
- **Phone:** one column at full width, 20–24px side padding. Scale down proportionally: keypad keys ~72–84px, hero numbers ~40px, header clock ~20px. On the clock-out summary let the page scroll rather than compressing — order: hours worked → insights → items carousel → week chart.

## Content notes

- Staff photos and product images are drop-in placeholders in the prototype; production pulls them from staff records and the item catalogue.
- Insight copy is deliberately factual, not motivational: a statement plus a signed delta.
- Announcements are a short, dated list — three items maximum, so the screen stays readable at a glance.
