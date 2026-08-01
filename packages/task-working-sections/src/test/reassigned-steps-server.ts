import { setupServer } from "msw/node";
import { reassignedStepsMockHandlers } from "../mocks/reassigned-steps-handlers";

export const reassignedStepsTestServer = setupServer(
  ...reassignedStepsMockHandlers,
);
