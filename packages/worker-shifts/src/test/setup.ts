import { afterAll, afterEach, beforeAll } from "vitest";
import { resetWorkerShiftMockState } from "../mocks";
import { workerShiftTestServer } from "./server";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  workerShiftTestServer.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  workerShiftTestServer.resetHandlers();
  resetWorkerShiftMockState();
});

afterAll(() => {
  workerShiftTestServer.close();
});
