import { SlideCompositionRenderer } from "@beyo/presentation-runtime";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderingParityCompositionFixture } from "../../../presentation-runtime/src/rendering-parity-fixture";

describe("builder preview rendering parity fixture", () => {
  it("renders the shared composition recipe at reference scale", () => {
    render(
      <SlideCompositionRenderer
        elements={renderingParityCompositionFixture}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
      />,
    );
    const headline = screen.getByText("Shared parity headline");
    expect(headline).toHaveStyle({ left: "31.2px", fontSize: "32px" });
    expect(Number.parseFloat(headline.style.top)).toBeCloseTo(496.8);
  });
});
