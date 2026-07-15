import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const keyboardState = vi.hoisted(() => ({ isOpen: false }));
const reducedMotion = vi.hoisted(() => vi.fn(() => false));

vi.mock("../../../providers/KeyboardInsetProvider", () => ({
  useKeyboardInset: () => ({ isKeyboardOpen: keyboardState.isOpen }),
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );

  return { ...actual, useReducedMotion: reducedMotion };
});

import { FloatingKeyboardBar } from "./FloatingKeyboardBar";

type RenderControlArgs = {
  inputRef: RefObject<HTMLInputElement | null>;
  isFloating: boolean;
  isInlineHidden: boolean;
};

function renderControls({
  inputRef,
  isFloating,
}: RenderControlArgs): React.JSX.Element {
  return (
    <div data-testid={isFloating ? "floating-controls" : "inline-controls"}>
      <input
        ref={inputRef}
        data-testid={isFloating ? "floating-input" : "inline-input"}
      />
    </div>
  );
}

function renderNamedControls(
  name: string,
  { inputRef, isFloating }: RenderControlArgs,
): React.JSX.Element {
  return (
    <div data-testid={`${name}-${isFloating ? "floating" : "inline"}-controls`}>
      <input
        ref={inputRef}
        data-testid={`${name}-${isFloating ? "floating" : "inline"}-input`}
      />
    </div>
  );
}

describe("FloatingKeyboardBar", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    keyboardState.isOpen = false;
    reducedMotion.mockReturnValue(false);
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  it("retries focus after the panel portal commits", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const view = render(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    screen.getByTestId("inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId("floating-input"));
    });

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("aria-hidden"),
    );
    expect(consoleWarn).not.toHaveBeenCalledWith(
      expect.stringContaining("aria-hidden"),
    );
    expect(document.body.style.overflow).toBe("hidden");

    keyboardState.isOpen = false;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("floating-input")).toBeNull();
      expect(document.body.style.overflow).toBe("");
    });

    expect(window.scrollTo).toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it("makes a closing panel click-through immediately", async () => {
    const view = render(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    screen.getByTestId("inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("floating-input")).toBeTruthy();
    });

    keyboardState.isOpen = false;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    const floatingInput = screen.getByTestId("floating-input");
    expect(
      floatingInput.parentElement?.parentElement?.parentElement?.className,
    ).toContain("pointer-events-none");
  });

  it("blurs the floating input before closing the keyboard panel", async () => {
    const view = render(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    screen.getByTestId("inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );
    const floatingInput = await screen.findByTestId("floating-input");
    expect(document.activeElement).toBe(floatingInput);

    keyboardState.isOpen = false;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControls}
      />,
    );

    expect(document.activeElement).not.toBe(floatingInput);
  });

  it("reports inline-hidden state and uses resting reduced-motion styles", async () => {
    reducedMotion.mockReturnValue(true);
    const renderControlsMock = vi.fn(renderControls);
    const view = render(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControlsMock}
      />,
    );

    expect(renderControlsMock.mock.calls[0]?.[0].isInlineHidden).toBe(false);
    expect(renderControlsMock.mock.calls[1]?.[0].isInlineHidden).toBe(false);
    expect(renderControlsMock.mock.calls[0]?.[0].isPanelOpening).toBe(false);
    expect(renderControlsMock.mock.calls[1]?.[0].isPanelOpening).toBe(false);

    screen.getByTestId("inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <FloatingKeyboardBar
        variant="panel"
        renderControls={renderControlsMock}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("floating-input")).toBeTruthy();
    });

    const latestCalls = renderControlsMock.mock.calls.slice(-2);
    expect(latestCalls[0]?.[0].isInlineHidden).toBe(true);
    expect(latestCalls[1]?.[0].isInlineHidden).toBe(false);
    expect(
      renderControlsMock.mock.calls.some(
        ([args]) => args.isPanelOpening === true,
      ),
    ).toBe(true);
    expect(latestCalls[0]?.[0].isPanelOpening).toBe(false);
    expect(latestCalls[1]?.[0].isPanelOpening).toBe(false);

    const floatingControls = screen.getByTestId("floating-controls");
    const motionContent = floatingControls.parentElement;
    const motionPanel = motionContent?.parentElement;
    expect(motionContent?.style.clipPath).toBe("inset(0px 0px 0px 0px)");
    expect(motionPanel?.style.transform ?? "").toMatch(/^$|none|0px/);
  });

  it("keeps the default bar presentation available", () => {
    const renderControlsMock = vi.fn(renderControls);
    render(<FloatingKeyboardBar renderControls={renderControlsMock} />);

    expect(renderControlsMock.mock.calls[0]?.[0].isFloating).toBe(false);
    expect(renderControlsMock.mock.calls[1]?.[0].isFloating).toBe(true);
    expect(renderControlsMock.mock.calls[0]?.[0].isInlineHidden).toBe(false);
    expect(renderControlsMock.mock.calls[1]?.[0].isInlineHidden).toBe(false);
  });

  it("isolates panel ownership when focus moves between fields while the keyboard stays open", async () => {
    const renderNamed = (name: string) =>
      ({ inputRef, isFloating }: RenderControlArgs) =>
        renderNamedControls(name, { inputRef, isFloating });
    const view = render(
      <>
        <FloatingKeyboardBar
          variant="panel"
          renderControls={renderNamed("first")}
        />
        <FloatingKeyboardBar
          variant="panel"
          renderControls={renderNamed("second")}
        />
      </>,
    );

    screen.getByTestId("first-inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <>
        <FloatingKeyboardBar
          variant="panel"
          renderControls={renderNamed("first")}
        />
        <FloatingKeyboardBar
          variant="panel"
          renderControls={renderNamed("second")}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("first-floating-input")).toBeTruthy();
      expect(screen.queryByTestId("second-floating-input")).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByTestId("first-floating-input"),
      );
    });

    screen.getByTestId("second-inline-input").focus();

    await waitFor(() => {
      expect(screen.queryByTestId("first-floating-input")).toBeNull();
      expect(screen.getByTestId("second-floating-input")).toBeTruthy();
      expect(document.activeElement).toBe(
        screen.getByTestId("second-floating-input"),
      );
    });
  });

  it("keeps exactly one owner through repeated rapid field handoffs", async () => {
    reducedMotion.mockReturnValue(true);
    const renderNamed = (name: string) =>
      ({ inputRef, isFloating }: RenderControlArgs) =>
        renderNamedControls(name, { inputRef, isFloating });
    const fields = ["first", "second", "third"];
    const renderFields = () => (
      <>
        {fields.map((name) => (
          <FloatingKeyboardBar
            key={name}
            variant="panel"
            renderControls={renderNamed(name)}
          />
        ))}
      </>
    );
    const view = render(renderFields());

    screen.getByTestId("first-inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(renderFields());

    await waitFor(() => {
      expect(screen.getByTestId("first-floating-input")).toBeTruthy();
    });

    for (const name of ["second", "third", "first", "third", "second"]) {
      screen.getByTestId(`${name}-inline-input`).focus();

      await waitFor(() => {
        expect(screen.getByTestId(`${name}-floating-input`)).toBeTruthy();
        expect(screen.getAllByTestId(/-floating-controls$/)).toHaveLength(1);
        expect(document.activeElement).toBe(
          screen.getByTestId(`${name}-floating-input`),
        );
      });
    }
  });

  it("does not steal focus between bar-variant fields", async () => {
    const renderNamed = (name: string) =>
      ({ inputRef, isFloating }: RenderControlArgs) =>
        renderNamedControls(name, { inputRef, isFloating });
    const view = render(
      <>
        <FloatingKeyboardBar renderControls={renderNamed("first")} />
        <FloatingKeyboardBar renderControls={renderNamed("second")} />
      </>,
    );

    screen.getByTestId("first-inline-input").focus();
    keyboardState.isOpen = true;
    view.rerender(
      <>
        <FloatingKeyboardBar renderControls={renderNamed("first")} />
        <FloatingKeyboardBar renderControls={renderNamed("second")} />
      </>,
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByTestId("first-floating-input"),
      );
    });

    screen.getByTestId("second-inline-input").focus();

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByTestId("second-floating-input"),
      );
    });
    expect(document.activeElement).not.toBe(
      screen.getByTestId("first-floating-input"),
    );
  });
});
