# SUMMARY_push_notification_deep_link_managers_20260621

## Metadata

- Summary ID: `SUMMARY_push_notification_deep_link_managers_20260621`
- Source plan: `docs/architecture/archives/implementation/PLAN_push_notification_deep_link_managers_20260621.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_push_notification_deep_link_20260621.md`
- Implemented at (UTC): `2026-06-21T16:54:23Z`

## Implementation summary

- Updated the shared push payload contract so `entity_type` and `entity_client_id` can be `null`, and added `task_client_id` for task-step notifications.
- Updated the managers service worker to encode notification deep-link intent in URL params for task, task step, case, and upholstery fallback notifications.
- Added the managers `NotificationDeepLinkMount` to mark tapped notifications read, open task detail surfaces, navigate to case conversations, and route upholstery notifications to `/upholstery-inventory`.
- Updated the workers service worker to encode task-step, case, and upholstery fallback deep links with worker-specific params.
- Added the workers `NotificationDeepLinkMount` to mark tapped notifications read, resolve task-step working-section context, open the worker task-step detail slide, navigate to case conversations, and default upholstery notifications to home.
- Wired both deep-link mounts into their app root routes inside the existing auth, realtime, PWA, and surface provider trees.

## Verification

- `npm run typecheck`: passed.

## Notes

- Worker task-step deep linking needs one client-side lookup because the push payload does not include `working_section_id`, while the worker detail slide requires it.
- The worker lookup scans assigned working sections and paginates section steps until it finds the pushed `entity_client_id`.
- Upholstery deep links remain temporary fallbacks: managers route to `/upholstery-inventory`, workers route to `/`.
