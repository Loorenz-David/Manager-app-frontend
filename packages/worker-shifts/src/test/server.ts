import { setupServer } from "msw/node";
import { workerShiftMockHandlers } from "../mocks";

export const workerShiftTestServer = setupServer(...workerShiftMockHandlers);
