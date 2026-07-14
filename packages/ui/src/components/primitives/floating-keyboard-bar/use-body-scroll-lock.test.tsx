import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useBodyScrollLock } from "./use-body-scroll-lock";

function Lock({ locked }: { locked: boolean }): null {
  useBodyScrollLock(locked);
  return null;
}

describe("useBodyScrollLock", () => {
  afterEach(() => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
  });

  it("restores the prior body styles and scroll position", () => {
    document.body.style.position = "relative";
    document.body.style.top = "12px";
    document.body.style.width = "80%";
    document.body.style.overflow = "auto";
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 240,
    });
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);

    const view = render(<Lock locked />);

    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-240px");
    expect(document.body.style.width).toBe("100%");
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(<Lock locked={false} />);

    expect(document.body.style.position).toBe("relative");
    expect(document.body.style.top).toBe("12px");
    expect(document.body.style.width).toBe("80%");
    expect(document.body.style.overflow).toBe("auto");
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });
});
