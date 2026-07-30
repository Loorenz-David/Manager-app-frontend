we will now create one more react frontend application for this set of apps we have at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps .

This application will be used for letting workers / users to clock in and out with a 4 digit code.

This application will use the same backend as the other apps ( it is part of the same group of applications ).

This application will be build using the same principles and architecture as the other applications having an app shell: /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/app and surface page centralized.

This application will also consume heavily from packages ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages ). in fact all the application features will be made packages as i will bring this features to the other applications as pages.

This application will be used on computer, ipad and phone . the interface should addapt cleanly to this differnet environments.

The backend has made a handoff that will help the initial construction of this app api at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md

The design im after can be found in the images i have placed at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation/clock_in_out_app/image_design

The desing is way ahead of what the backend can provide, so the frontend will build the components for supporting this data, and later one the backend will provide the real data thorugh the respond ( you should mention the data that the backend must provide so that i have an understanding of what i need to change at the backend )

We will create this on phases.

i will use multiple ai models to accomplish this

Codex as the logic implementer.

You fabel as the plan creator and orchestrator guide through the implementation and ui designer for ui components and interactions.
The plans must be build in such a way that codex will implement the logic ( as codex is good and fast for those tasks ), and you will implement the components, reusable independent components that will be used by codex to wire the logic.

opus 5 as the reviewer of the codex implementations

Codex and opus will start on a fresh session for each phase. I will keep your same session during the hole implementation.

You will create a master contract that will hold the goal and phases of the whole implementation, and the implementation plans on different files so that each can be processed individually.

You will create two sets of prompts, one for implementing the plans ( i will pass those prompts to codex for implementing the target plan ), and one set of review prompts ( i will pass those prompts to opus 5 for reviewing codex implementations ).

This whole implementation planning and orchestration will be created at /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/architecture/under_construction/implementation under a new folder holding the set of implementation plans, execution prompts and review prompts.

As i mention before this whole implementation of componoents and logic will be build in packages to be reused across applications. I want a clean architecture that follows strong SRP and single responsibility principles.

You can use the contracts guide ( /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/task_system/frontend_contract_goal_mapping_guide.md ), for aligning the implementation to the architectural principles.

## Lifecycle progress

### Linked implementation plans

| Plan | Status | Summary |
|---|---|---|
| `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase1_worker_shifts_package_20260729.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase1_worker_shifts_package_20260729.md` |
| `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase2_floor_auth_20260729.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase2_floor_auth_20260729.md` |
| `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729.md` |
| `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_corrections_20260729.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_corrections_20260729.md` |
| `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729.md` |
| `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_corrections_20260730.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_corrections_20260730.md` |
| `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` | approved | Phase sequence and governing decisions |

### Progress notes

- 2026-07-29: Phase 1 completed and archived. `@beyo/worker-shifts` now provides the logic-only worker-shift domain package and build-ahead MSW runtime; root typecheck and all 32 package tests passed.
- 2026-07-29: Phase 2 completed and archived. Floor-scope auth now persists/restores its non-expiring device token without refresh; floor 401 revocation asserted zero refresh calls; root typecheck and all 4 new package tests passed.
- 2026-07-29: Phase 3 completed and archived. The thin floor app host now boots with floor auth, persisted device config, real kiosk chrome, long-press-only rise settings, PWA/fonts, and an empty protected placeholder. The M1 amendment adds a floor-gated shared-auth `finally` that guarantees local revocation on logout API failure while preserving the default non-floor path. Root typecheck, auth 3/3 tests, floor 6/6 tests, UI 162/162 tests, and desktop Playwright 1/1 passed.
- 2026-07-29: Phase 3 corrections completed and archived. C1–C8 add the mobile/tablet/desktop validation matrix, 4–120 persisted auto-return safety, explicit revoked-device recovery state, and package/config hygiene. Root typecheck, floor 8/8 tests, UI 162/162, auth 3/3, api-client 3/3, all three bootstrap viewports, tablet revocation, lint, and build passed. C9/C11 remain completed; C10 remains closed without removal because Phase 4 consumes the shake utility.
- 2026-07-29: Phase 4 completed and archived. The reusable kiosk package now delivers local code/email identification, fresh-current confirmation, one explicit clock action, plain result screens, session-race suppression, 409 reconciliation, physical keyboard input, and atomic cleared-keypad auto-return through centralized `rise` surfaces. Root typecheck, kiosk 9/9, worker-shifts 36/36, mobile 5/5, desktop 5/5, build-ahead mock smoke, and floor build passed.
- 2026-07-30: Phase 4 corrections C1–C15 completed and archived. Kiosk execution is authenticated-route-only; physical keys are scoped away from sign-in/settings inputs; confirm/result use host-composed opaque frames over an always-mounted keypad; greeting, exit, failure, role, roster, mutation, env, MSW build, provider API, memo, real-409, and tablet-evidence findings are closed. Root typecheck, kiosk 18/18, worker-shifts 36/36, UI 162/162, auth 3/3, API client 3/3, floor 8/8, lint/build, and combined kiosk/bootstrap Playwright 7/7 on mobile/tablet/desktop passed.
