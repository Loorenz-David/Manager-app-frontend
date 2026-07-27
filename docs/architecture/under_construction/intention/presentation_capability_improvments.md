The timeline:

The space key action "pause/play" some times it works others it doesn't. it seems that when i have not focused on the timeline the play / pause no longer works i have to come back and interact with the time tracker to make the play / pause with the space key to work again. I will like this play and pause to be reliable even while i have focused something else. So the intention is if im not touching something that doen't require input text then the space should act as play / pause. if im interacting with some input that requires typing but i have unfocused the input it should still work ( part of the first rule, im just making sure it is understandable ).

When I upload images or videos They are not part of the time line, I should be able to move them around the time line. make them shorter, longer. add in / out transitions .
This media should also be editable, I should be able to resize it, move it around.

I should be able add multiple images and videos to the same slide

## Linked implementation plans

| Plan | Status | Result |
|---|---|---|
| `docs/architecture/archives/implementation/PLAN_presentation_text_block_corrections_20260723.md` | archived | Corrected text-only publish flushing, immediate/inline canvas editing, reliable drag hit areas, and reusable text styling controls. |
| `docs/architecture/archives/implementation/PLAN_presentation_timeline_media_corrections_20260723.md` | archived | Made Space transport reliable, unified all media as timed tracks, added sequential multi-upload, and completed media canvas resize plus enter/exit transitions. |
| `docs/architecture/archives/implementation/PLAN_presentation_timeline_media_review_corrections_20260723.md` | archived | Replaced the vacuous layer-0 parity test with concrete runtime, builder-preview, and player output pins and added test cleanup. |
| `docs/architecture/archives/implementation/PLAN_presentation_editor_panel_drawers_20260723.md` | archived | Grouped editor tools into controlled drawers with per-panel session state, source-aware concern auto-open, CTA validation visibility, and desktop regression coverage. |

## Progress notes

- 2026-07-23: Text-block correction work completed and archived. The broader
  timeline keyboard and multi-media intentions above remain separate follow-up
  scope.
- 2026-07-23: Timeline/media corrections completed and archived. Every canvas
  element is now a timeline track; media supports multi-upload, movement, trimming,
  proportional corner resize, free edge resize, and Appears/Disappears transitions.
- 2026-07-23: The Opus review defect is closed and archived. Legacy layer-0
  published media is now protected by one shared three-way parity fixture with
  concrete output assertions; the builder parity file no longer leaks DOM.
- 2026-07-23: Editor panel drawers completed and archived. Slide, text, and media
  tool groups retain independent session-local multi-open state; canvas selection
  opens the primary concern and timeline selection opens animations without
  closing other drawers.
