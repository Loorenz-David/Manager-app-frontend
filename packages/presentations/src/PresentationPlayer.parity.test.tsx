import {
  renderingParityBackgroundColorFixture,
  renderingParityCompositionFixture,
} from "../../presentation-runtime/src/rendering-parity-fixture";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PresentationPlayer } from "./PresentationPlayer";
import { consumerPresentationFixture } from "./test/fixtures";

describe("phone player rendering parity fixture", () => {
  it("renders the same shared composition recipe at reference scale", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(690);
    render(
      <PresentationPlayer
        presentation={{
          ...consumerPresentationFixture,
          slides: [{
            ...consumerPresentationFixture.slides[0]!,
            background_color: renderingParityBackgroundColorFixture,
            elements: [...renderingParityCompositionFixture],
          }],
        }}
        navigate={vi.fn()}
        onProgress={vi.fn()}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
        onMediaExpired={async () => null}
      />,
    );
    const headline = screen.getByText("Shared parity headline");
    expect(headline).toHaveStyle({ left: "31.2px", fontSize: "32px" });
    expect(Number.parseFloat(headline.style.top)).toBeCloseTo(496.8);
    const image = screen.getByAltText("Shared parity layer zero");
    expect(image).toHaveStyle({
      left: "0px",
      top: "0px",
      width: "390px",
      height: "690px",
      objectFit: "cover",
    });
    expect(screen.getByTestId("slide-composition-renderer")).toHaveStyle({
      backgroundColor: renderingParityBackgroundColorFixture,
    });
  });
});
