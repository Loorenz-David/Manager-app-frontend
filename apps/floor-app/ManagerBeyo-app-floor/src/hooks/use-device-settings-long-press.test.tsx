import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeviceSettingsLongPress } from "@/hooks/use-device-settings-long-press";

function LongPressHarness({
  onLongPress,
}: {
  onLongPress: () => void;
}): React.JSX.Element {
  const props = useDeviceSettingsLongPress(onLongPress);
  return <div data-testid="identity" {...props} />;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("device settings long press", () => {
  it("ignores an idle tap and opens only after a 600 ms hold", () => {
    const onLongPress = vi.fn();
    render(<LongPressHarness onLongPress={onLongPress} />);
    const identity = screen.getByTestId("identity");

    fireEvent.pointerDown(identity, { button: 0 });
    act(() => vi.advanceTimersByTime(599));
    fireEvent.pointerUp(identity);
    act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).not.toHaveBeenCalled();

    fireEvent.click(identity);
    expect(onLongPress).not.toHaveBeenCalled();

    fireEvent.pointerDown(identity, { button: 0 });
    act(() => vi.advanceTimersByTime(600));
    expect(onLongPress).toHaveBeenCalledOnce();
  });
});
