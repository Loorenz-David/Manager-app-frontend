The backend now returns a serialize object of the pause reason. the endpoints that should adapt are documented at HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722 copy

We should update the schemas and also the stats pages that where the pause reason and description should render as we had it before we replaced it with pause_reason_id.

at WorkerTimelineSlidePage:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/pages/WorkerTimelineSlidePage.tsx

on the event blocks that render the pause.

at WorkerStatsSlidePage:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/stats/src/pages/WorkerStatsSlidePage.tsx

at the WorkerStatsCard on the "third row".

HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722 copy:
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722 copy.md

I will like you to first review the impact that this update has and where should we generate the updates so that i can visualize the pause reasons and description again
