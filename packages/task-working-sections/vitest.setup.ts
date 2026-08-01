import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { reassignedStepsTestServer } from "./src/test/reassigned-steps-server";

// The two reassigned-steps endpoints are not live yet — every suite runs
// against the build-ahead mocks (handoff §13).
beforeAll(() => {
  reassignedStepsTestServer.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  cleanup();
  reassignedStepsTestServer.resetHandlers();
});

afterAll(() => {
  reassignedStepsTestServer.close();
});
