import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useEditorTransportHotkey } from "./use-editor-transport-hotkey";

function dispatchSpace(target: EventTarget): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: " ",
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function HotkeyTargets({
  onTogglePlay,
  publishDialogOpen = false,
}: {
  onTogglePlay: () => void;
  publishDialogOpen?: boolean;
}) {
  useEditorTransportHotkey(onTogglePlay, { publishDialogOpen });

  return (
    <>
      <button type="button">Play</button>
      <canvas tabIndex={0} data-testid="canvas" />
      <textarea aria-label="Content" />
      <div contentEditable suppressContentEditableWarning>
        <span data-testid="editable-child">Editable</span>
      </div>
    </>
  );
}

describe("useEditorTransportHotkey", () => {
  afterEach(() => cleanup());

  it.each([
    ["body", () => document.body],
    ["button", () => screen.getByRole("button", { name: "Play" })],
    ["canvas", () => screen.getByTestId("canvas")],
  ])("toggles once and prevents the space default with %s focus", (_label, getTarget) => {
    const onTogglePlay = vi.fn();
    render(<HotkeyTargets onTogglePlay={onTogglePlay} />);
    const target = getTarget();
    if (target instanceof HTMLElement) target.focus();

    const event = dispatchSpace(target);

    expect(event.defaultPrevented).toBe(true);
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("does not intercept spaces in a textarea or contentEditable ancestor", () => {
    const onTogglePlay = vi.fn();
    render(<HotkeyTargets onTogglePlay={onTogglePlay} />);
    const textarea = screen.getByRole("textbox", { name: "Content" });

    textarea.focus();
    expect(dispatchSpace(textarea).defaultPrevented).toBe(false);
    expect(onTogglePlay).not.toHaveBeenCalled();

    const editableChild = screen.getByTestId("editable-child");
    expect(dispatchSpace(editableChild).defaultPrevented).toBe(false);
    expect(onTogglePlay).not.toHaveBeenCalled();
  });

  it("works immediately after a typing target loses focus", () => {
    const onTogglePlay = vi.fn();
    render(<HotkeyTargets onTogglePlay={onTogglePlay} />);
    const textarea = screen.getByRole("textbox", { name: "Content" });

    textarea.focus();
    dispatchSpace(textarea);
    textarea.blur();
    const event = dispatchSpace(document.body);

    expect(event.defaultPrevented).toBe(true);
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("ignores an already prevented space event", () => {
    const onTogglePlay = vi.fn();
    renderHook(() => useEditorTransportHotkey(onTogglePlay));
    const event = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();

    act(() => {
      document.body.dispatchEvent(event);
    });

    expect(onTogglePlay).not.toHaveBeenCalled();
  });

  it("is suppressed while the publish dialog is open", () => {
    const onTogglePlay = vi.fn();
    render(<HotkeyTargets onTogglePlay={onTogglePlay} publishDialogOpen />);

    const event = dispatchSpace(document.body);

    expect(event.defaultPrevented).toBe(false);
    expect(onTogglePlay).not.toHaveBeenCalled();
  });
});
