import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MOCK_CLOCKED_IN_USER_ID,
  MOCK_CLOCKED_OUT_USER_ID,
  MOCK_DECLARED_USER_ID,
  MOCK_UNKNOWN_USER_ID,
} from "../mocks";
import { fetchCurrentShift } from "../api/fetch-current-shift";
import { createQueryTestWrapper } from "../test/query-wrapper";
import { useClockIn } from "./use-clock-in";
import { useClockOut } from "./use-clock-out";
import { useCloseDeclaredState } from "./use-close-declared-state";
import { useDeclareState } from "./use-declare-state";

describe("worker-shift action hooks against build-ahead handlers", () => {
  it("clocks in, flips server state, and returns 409 when repeated", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useClockIn, { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.clockInAsync({ user_id: MOCK_CLOCKED_OUT_USER_ID }),
      ).resolves.toEqual({
        action: "clock_in",
        user_id: MOCK_CLOCKED_OUT_USER_ID,
      });
    });
    await expect(fetchCurrentShift(MOCK_CLOCKED_OUT_USER_ID)).resolves.toMatchObject(
      { clocked_in: true },
    );

    await act(async () => {
      await expect(
        result.current.clockInAsync({ user_id: MOCK_CLOCKED_OUT_USER_ID }),
      ).rejects.toMatchObject({
        status: 409,
        message: "Worker is already clocked in.",
      });
    });
  });

  it("returns 404 when clocking in an unknown target", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useClockIn, { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.clockInAsync({ user_id: MOCK_UNKNOWN_USER_ID }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  it("clocks out with populated analytics and transitioned steps", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useClockOut, { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.clockOutAsync({ user_id: MOCK_CLOCKED_IN_USER_ID }),
      ).resolves.toMatchObject({
        action: "clock_out",
        user_id: MOCK_CLOCKED_IN_USER_ID,
        transitioned_steps: 2,
        analytics: {
          date: "2026-07-29",
          segments_truncated: false,
        },
      });
    });
    await expect(fetchCurrentShift(MOCK_CLOCKED_IN_USER_ID)).resolves.toMatchObject(
      { clocked_in: false },
    );
  });

  it("clocks out with analytics null and zero transitioned steps", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useClockOut, { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.clockOutAsync({ user_id: MOCK_DECLARED_USER_ID }),
      ).resolves.toEqual({
        action: "clock_out",
        user_id: MOCK_DECLARED_USER_ID,
        transitioned_steps: 0,
        analytics: null,
      });
    });
  });

  it("returns clock-out 409 and 404 branches", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useClockOut, { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.clockOutAsync({ user_id: MOCK_CLOCKED_OUT_USER_ID }),
      ).rejects.toMatchObject({
        status: 409,
        message: "Worker is not clocked in.",
      });
      await expect(
        result.current.clockOutAsync({ user_id: MOCK_UNKNOWN_USER_ID }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  it("declares a state and switches an existing declaration", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useDeclareState, { wrapper: Wrapper });
    const before = await fetchCurrentShift(MOCK_DECLARED_USER_ID);

    await act(async () => {
      await expect(
        result.current.declareStateAsync({
          user_id: MOCK_DECLARED_USER_ID,
          pause_reason_id: "par_cleaning",
          description: "Cleaning section B",
        }),
      ).resolves.toMatchObject({
        shift_state: "in_pause",
        paused_steps: 0,
        declared_state: {
          pause_reason: { id: "par_cleaning", name: "Cleaning" },
          description: "Cleaning section B",
        },
      });
    });

    const after = await fetchCurrentShift(MOCK_DECLARED_USER_ID);
    expect(after.declared_state?.id).not.toBe(before.declared_state?.id);
    expect(after.declared_state?.pause_reason.id).toBe("par_cleaning");
    expect(after.declared_state?.pause_reason.image_url).toBeNull();
  });

  it("returns declare 409, target/reason 404, and validation 422 branches", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useDeclareState, { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.declareStateAsync({
          user_id: MOCK_CLOCKED_OUT_USER_ID,
          pause_reason_id: "par_lunch",
        }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        result.current.declareStateAsync({
          user_id: MOCK_UNKNOWN_USER_ID,
          pause_reason_id: "par_lunch",
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        result.current.declareStateAsync({
          user_id: MOCK_CLOCKED_IN_USER_ID,
          pause_reason_id: "par_unknown",
        }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        result.current.declareStateAsync({
          user_id: MOCK_CLOCKED_IN_USER_ID,
          pause_reason_id: "par_blocker",
        }),
      ).rejects.toMatchObject({ status: 422 });
      await expect(
        result.current.declareStateAsync({
          user_id: MOCK_CLOCKED_IN_USER_ID,
          pause_reason_id: "par_cleaning",
        }),
      ).rejects.toMatchObject({
        status: 422,
        message: "Description is required.",
      });
    });
  });

  it("closes an open declaration and leaves the worker idle", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useCloseDeclaredState, {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.closeDeclaredStateAsync({
          user_id: MOCK_DECLARED_USER_ID,
        }),
      ).resolves.toEqual({
        shift_state: "idle",
        closed_declared_state_id: "uds_open",
      });
    });
    await expect(fetchCurrentShift(MOCK_DECLARED_USER_ID)).resolves.toMatchObject(
      { state: "idle", declared_state: null },
    );
  });

  it("returns close-declaration 409 and 404 branches", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(useCloseDeclaredState, {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.closeDeclaredStateAsync({
          user_id: MOCK_CLOCKED_IN_USER_ID,
        }),
      ).rejects.toMatchObject({
        status: 409,
        message: "No declared state is open.",
      });
      await expect(
        result.current.closeDeclaredStateAsync({
          user_id: MOCK_UNKNOWN_USER_ID,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
