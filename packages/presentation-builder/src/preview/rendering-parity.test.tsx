import { SlideCompositionRenderer } from "@beyo/presentation-runtime";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  renderingParityBackgroundColorFixture,
  renderingParityCompositionFixture,
} from "../../../presentation-runtime/src/rendering-parity-fixture";

afterEach(cleanup);

describe("builder preview rendering parity fixture", () => {
  it("renders legacy layer-0 media at reference scale", () => {
    render(
      <SlideCompositionRenderer
        elements={renderingParityCompositionFixture}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
      />,
    );

    const image = screen.getByAltText("Shared parity layer zero");
    expect(image).toHaveStyle({
      left: "0px",
      top: "0px",
      width: "390px",
      height: "690px",
      objectFit: "cover",
    });
  });

  it("renders the shared composition recipe at reference scale", () => {
    const view = render(
      <SlideCompositionRenderer
        elements={renderingParityCompositionFixture}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
        backgroundColor={renderingParityBackgroundColorFixture}
      />,
    );
    expect(
      view.container.querySelector("[data-testid='slide-composition-renderer']"),
    ).toHaveStyle({
      backgroundColor: renderingParityBackgroundColorFixture,
    });
    const headline = screen.getByText("Shared parity headline");
    expect(headline).toHaveStyle({
      left: "31.2px",
      fontSize: "32px",
      color: "#FFFFFF",
      backgroundColor: "#3F78A8",
      borderRadius: "12px",
      padding: "8px",
      textAlign: "center",
    });
    expect(Number.parseFloat(headline.style.top)).toBeCloseTo(496.8);
  });
});
