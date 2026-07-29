import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeviceSettingsPage } from "@/pages/DeviceSettingsPage";
import {
  AUTO_RETURN_SECONDS_RANGE,
  useDeviceConfigStore,
} from "@/store/device-config.store";

const surfaceMocks = vi.hoisted(() => ({
  close: vi.fn(),
}));

vi.mock("@beyo/hooks", async () => {
  const actual = await vi.importActual<typeof import("@beyo/hooks")>(
    "@beyo/hooks",
  );
  return {
    ...actual,
    useSurface: () => ({
      close: surfaceMocks.close,
    }),
  };
});

beforeEach(() => {
  surfaceMocks.close.mockClear();
  useDeviceConfigStore.getState().resetDeviceConfig();
});

describe("DeviceSettingsPage", () => {
  it("rejects an out-of-range auto-return value without saving or closing", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <DeviceSettingsPage />
      </QueryClientProvider>,
    );

    const input = screen.getByTestId("device-auto-return-input");
    expect(input).toHaveAttribute(
      "min",
      String(AUTO_RETURN_SECONDS_RANGE.min),
    );
    expect(input).toHaveAttribute(
      "max",
      String(AUTO_RETURN_SECONDS_RANGE.max),
    );

    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.click(screen.getByTestId("device-settings-save"));

    expect(screen.getByTestId("device-auto-return-error")).toHaveTextContent(
      "Enter a whole number from 4 to 120 seconds.",
    );
    expect(useDeviceConfigStore.getState().autoReturnSeconds).toBe(12);
    expect(surfaceMocks.close).not.toHaveBeenCalled();
  });
});
