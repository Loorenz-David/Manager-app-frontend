import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TickingTimer } from "./TickingTimer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TickingTimer", () => {
  it("ticks at the configured rate", () => {
    vi.useFakeTimers();
    const startedAtIso = "2026-07-18T12:00:00.000Z";
    vi.setSystemTime(new Date(startedAtIso));

    render(
      <TickingTimer
        data-testid="timer"
        ratePerSecond={1 / 3}
        startedAtIso={startedAtIso}
      />,
    );

    expect(screen.getByTestId("timer")).toHaveTextContent("00:00:00");

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByTestId("timer")).toHaveTextContent("00:00:01");
  });

  it("keeps the default real-time rate", () => {
    vi.useFakeTimers();
    const startedAtIso = "2026-07-18T12:00:00.000Z";
    vi.setSystemTime(new Date(startedAtIso));

    render(<TickingTimer data-testid="timer" startedAtIso={startedAtIso} />);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByTestId("timer")).toHaveTextContent("00:00:03");
  });
});
