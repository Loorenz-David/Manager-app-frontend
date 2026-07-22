# Handoff: Announcement Builder (phone announcements)

## Overview

A feature inside a **phone app** that lets managers create and publish announcements — short, slide-based posts used to communicate news, routines, and app updates. Each announcement is a sequence of **portrait (phone-format) slides**; each slide has one media item (an uploaded image OR video) and any number of **text blocks**, where each text block is timed on a mini video-editor timeline (when it appears, when it disappears) with an appear/disappear animation.

This handoff covers two screens:

- **1a — Announcements dashboard**: the list managers land on to manage existing announcements.
- **1b — Editor**: create/edit a single announcement, slide by slide, with the timed-text timeline.

## About the design files

The file in this bundle (`Announcement Builder.dc.html`) is a **design reference created in HTML** — a working prototype showing intended look and behavior. It is **not production code to copy directly**; it runs on a custom prototyping runtime, not a shippable framework.

Your task is to **recreate these designs in the target codebase's existing environment** (the phone app — React Native, Flutter, SwiftUI, native, etc.) using its established components, navigation, and styling patterns. If no environment exists yet, pick the framework that best fits the app and implement there. Treat the HTML as the source of truth for layout, spacing, color, typography, and interaction — not for architecture.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interactions are final and intended to be matched closely. Two caveats:

- The prototype was drawn at desktop scale to show the editor's panels side by side. In the real **phone app**, the editor's three regions (slide list, canvas, properties) should be re-flowed into a mobile layout (e.g. canvas full-width with the slide list and properties as a bottom sheet / tabs). Keep the _canvas + timeline_ interaction model; adapt the chrome to a phone.
- Media is shown as a labeled placeholder slot — real upload/playback is backend + native work.

---

## Screens / Views

### 1a — Announcements dashboard

**Purpose:** Managers browse, filter, and open existing announcements, or start a new one.

**Layout**

- Top bar (height 60): workspace avatar (26×26, radius 7, `#303030` bg, white initial) + title "Announcements" on the left; a search field (radius 8, `#f4f4f4` fill, `#e7e7e7` border, placeholder `#9a9a9a`) + a 30×30 circular user avatar on the right.
- Filter row: segmented text filters (`All` active — white chip, `#e0e0e0` border; `Published` / `Drafts` / `Scheduled` inactive, `#767676`) on the left; a primary `+ New announcement` button on the right (`#303030` bg, white, radius 8, padding 9×16).
- Content: responsive **card grid** (3 columns on wide, collapse to 1–2 on phone). First cell is a dashed "New announcement" card; the rest are announcement cards.

**Announcement card**

- Container: white, `1px #e7e7e7` border, radius 12.
- Cover (height ~184, `#ececec` bg) with a centered **mini phone**: 88×156 rectangle, radius 13, `3px solid #1c1c1c` border, filled with the media placeholder stripe. Media chips (e.g. `IMG`, `VIDEO`) sit at the mini-phone's bottom (mono 9px, `rgba(0,0,0,.35)` bg, white text, radius 4).
- Status pill, top-right of cover: `Published` → accent tint (`rgba(63,120,168,.15)` bg, `#2c5372` text); `Draft` → `#eeeeee` bg, `#767676`; `Scheduled` → `#f6ecd6` bg, `#a9791b`. Pill is mono-ish 10.5px, weight 700, radius 20.
- Body (padding 14×15): title (14.5px, weight 700, `#303030`) + meta line (12px, `#9a9a9a`, e.g. "3 slides · edited 2 days ago").
- "New announcement" dashed card: `1.5px dashed #cdcdcd`, radius 12, `#fafafa` bg, centered `+` + "New announcement" + "Start from blank" (`#9a9a9a`).

### 1b — Editor

**Purpose:** Build one announcement — manage slides, place media, add/time/animate text, preview, save/publish.

**Layout (prototype, desktop framing)** — three regions plus a top bar:

- **Top bar** (height 54): back chevron `‹`, editable announcement title (14.5px/700), a `Draft` status pill (`#f0f0f0`/`#767676`, radius 20). Right side: `▶ Preview` and `Save draft` (ghost buttons — white, `1px #dcdcdc`, radius 8) and `Publish` (primary `#303030`).
- **Left slide rail** (width ~186, `#fafafa`, `1px #e7e7e7` right border): "SLIDES" label (11px, uppercase, `#9a9a9a`, letter-spacing .1em) + `+` to add. Vertical list of slide cards.
  - Slide card: white, radius 9, padding 9 (top 20). Selected → `1.5px solid` accent border + `0 0 0 3px rgba(accent,.14)` ring. Drag handle `⋮⋮` top-left (`cursor: grab`), slide number top-right (11px/700 `#9a9a9a`). Portrait thumbnail **58×104**, radius 7, centered, filled with media stripe + mono media label. Footer row: text count ("2 texts") + a delete `✕` (`#c05a5a`).
- **Center** (`#f4f4f4`): the **canvas** centered in the upper area, the **timeline** docked at the bottom.
  - **Canvas** = phone screen: **264×470**, radius 20, `4px solid #1c1c1c` bezel, media-stripe background, `0 12px 34px -14px rgba(0,0,0,.4)` shadow. Center placeholder shows a mono media-kind pill (`IMAGE`/`VIDEO`) + hint ("Drop or upload an image/video"). **Text blocks render absolutely positioned** over it (see Text block).
  - **Timeline** (white, `1px #e7e7e7` top border, padding 12×16):
    - Controls row: round **play/pause** button (32×32, `#303030`, white glyph `▶`/`❚❚`), timecode (mono, "0.0s / 6.0s"), `+ Text` button (ghost). Right: helper text.
    - **Ruler**: a fixed-width label gutter (120px) then a flexible time axis with second ticks (mono 9px `#b0b0b0`, positioned by `time/duration`).
    - **Track per text block** (height 36): a 120px label (text preview; selected → accent/700) + a track lane (`#f6f6f6`, radius 7) containing the block's **bar**.
      - Bar: absolutely positioned, `left = appear/duration`, `width = (disappear-appear)/duration`. Fill `rgba(accent,.16)` (selected `.30`), border `1.5px` accent. `cursor: grab`. Center label shows `"{animIn} · {animOut}"` (e.g. "Slide · Fade"). A 7px accent **handle** at each end (`cursor: ew-resize`).
    - **Playhead**: a 2px `#e04b4b` vertical line spanning the tracks, positioned by `playhead/duration` (offset past the 120px gutter). Draggable.
- **Right properties panel** (width ~250, `#fafafa`, left border). Two states:
  - **Text block selected**: "TEXT BLOCK" label; content `<textarea>` (radius 8, `1px #dcdcdc`); **Appears** segmented control `Fade / Slide / None`; **Disappears** segmented `Fade / Slide / None` (active segment = accent bg, white; inactive `#666`; track `#f0f0f0`, radius 8); **Size** slider (12–52px, `accent-color:#303030`); read-only window label ("0.4s → 4.6s"); **Delete text block** (`#c05a5a`).
  - **No text selected (slide props)**: "SLIDE" label; a "Replace image/video" upload affordance (dashed, `↥`); **Slide duration** slider (2–12s, step 0.5); hint to select a text block.

**Preview overlay** (covers the editor, `#161616`): a centered phone (**300×533**, radius 22, `5px solid #000`) playing the announcement; `✕ Exit` top-right; bottom row with play/pause, a white progress bar (fraction of total announcement duration), and slide dots (active dot widens to 18px).

---

## Interactions & behavior

**Timeline (the core interaction — mirrors a phone video editor)**

- **Drag a bar's left/right handle** → change `appear` / `disappear`. Enforce a minimum on-screen length of **0.4s**; clamp within `[0, slideDuration]`.
- **Drag the bar body** → move the whole window, preserving length; clamp so it stays within the slide.
- **Drag the playhead** (or press anywhere on the ruler) → scrub; scrubbing **pauses** playback.
- Selecting a bar (click bar or its track label) selects that text block and opens its properties.

**Canvas**

- Text blocks are **draggable** to reposition (stored as `x`/`y` percentages, clamped ~5–95% / 6–94%). Dragging selects the block.
- A selected block that is currently outside its on-screen window is shown faint (opacity .25) with a dashed outline so it can still be positioned.

**Text appear/disappear animation** (drives canvas + preview opacity/transform at the current `playhead` time `t`), with `ANIM = 0.45s`:

- `pIn = clamp((t - appear)/ANIM, 0, 1)`, `pOut = clamp((disappear - t)/ANIM, 0, 1)`.
- `none` → step (visible instantly across the window). `fade` → opacity follows the progress. `slide` → same opacity, plus `translateY`: enters from +20px, exits toward −20px.
- Opacity while in-window = `min(pIn, pOut)`; 0 outside the window.

**Playback**

- **Play in editor** loops the _current_ slide from 0 to its duration.
- **Preview** starts at slide 1 and plays **through all slides** in order, advancing at each slide's duration, and stops on the last slide's final frame. Progress bar = elapsed / total duration across all slides.
- Uses `requestAnimationFrame`; clamp per-frame `dt` (≤0.1s) so background-tab jumps don't skip.

**Slide management**

- **Add slide** appends a blank image slide and selects it.
- **Delete slide** removes it (block deleting the last remaining slide); reselect a neighbor.
- **Reorder** via dragging a slide (rail = vertical; a filmstrip variant would be horizontal): compute target index from pointer position vs sibling centers and reorder live.
- **Add text** inserts a block starting at the current playhead, ~2.5s long, using the default appear animation.

**Buttons**

- `Save draft` / `Publish` and the dashboard filters/search are presentational in the prototype — wire to your backend.

---

## State management

```
announcement = {
  title: string,
  slides: Slide[]
}

Slide = {
  id: string,
  media: 'image' | 'video',       // + upload ref in production
  duration: number,               // seconds, 2–12
  texts: TextBlock[]
}

TextBlock = {
  id: string,
  content: string,                // may contain \n
  appear: number,                 // seconds, >= 0
  disappear: number,              // seconds, <= duration, >= appear + 0.4
  animIn:  'fade' | 'slide' | 'none',
  animOut: 'fade' | 'slide' | 'none',
  x: number, y: number,           // % of canvas, center-anchored
  size: number,                   // px (at design canvas scale), 12–52
  weight: number                  // 400 body / 700 heading
}
```

Editor-only (view) state, not persisted with the announcement:

- `currentSlideId`, `selectedTextId`, `playhead` (seconds), `playing` (bool), `mode` ('edit' | 'preview').

**Data fetching:** dashboard loads the list of announcements (title, status, slide count, media summary, last-edited). Editor loads/saves one announcement. Media upload returns a media ref to store on the slide.

---

## Design tokens

**Color**

- App background: `#f4f4f4` · page/gutter: `#ededed` · surface: `#ffffff`
- Ink (primary text / primary buttons): `#303030`
- Secondary text: `#767676` · muted / labels: `#9a9a9a` · faint: `#b0b0b0`
- Borders: `#e7e7e7` (default), `#e0e0e0`, `#dcdcdc` (inputs), `#cdcdcd` (dashed)
- Accent (light blue — selection, timeline bars, playhead label): `#3f78a8`; tints `rgba(63,120,168,.14/.16/.30)`; deep text `#2c5372`
- Playhead line: `#e04b4b`
- Warning / Scheduled: pill `#f6ecd6` bg, `#a9791b` text (amber)
- Destructive: `#c05a5a`
- Phone bezel: `#1c1c1c` / `#000`
- Media placeholder: 135° stripes over `#474d56` (`repeating-linear-gradient(135deg, #474d56 0 11px, #414751 11px 22px)`)

**Typography**

- UI: `"Helvetica Neue", Helvetica, Arial, sans-serif`
- Timecodes / mono labels: `ui-monospace, Menlo, monospace`
- Scale seen: 22 (page title) / 15 / 14.5 / 13 / 12 / 11 / 10.5 / 9. Weights 400 / 500 / 600 / 700. Labels use `letter-spacing: .1em`, uppercase.

**Radius:** buttons/inputs 8 · thumbnails 7 · cards 9–14 · phone canvas 20–22 · pills 20.
**Spacing:** panel padding 14–16; card gaps 18; timeline label gutter 120px (rail), 96px (compact).
**Shadow:** cards `0 24px 60px -30px rgba(0,0,0,.28)`; canvas `0 12px 34px -14px rgba(0,0,0,.4)`.
**Motion:** text in/out `ANIM = 0.45s`; slide offset 20px; active preview dot width transitions .2s.
**Tweakable (prototype props):** `accent` color, `brandName`, `defaultAnimIn`.

## Assets

No image/icon assets — all media is a CSS-stripe placeholder standing in for uploaded image/video. Glyphs used are plain Unicode (`‹ ▶ ❚❚ ✕ ↥ ⋮⋮ →`); replace with your app's icon set. No brand assets.

## Files

- `Announcement Builder.dc.html` — the full interactive prototype (dashboard + editor + preview). Open it in the design tool to interact; it will not run standalone without its prototyping runtime. Use it as the visual + interaction reference.
- `screenshots/1a-dashboard.png` — the announcements dashboard.
- `screenshots/1b-editor.png` — the editor: slide rail, phone canvas, properties.
- `screenshots/1b-editor-timeline.png` — the editor's timed-text timeline (bars = each text's on-screen window, red playhead, second ruler).
