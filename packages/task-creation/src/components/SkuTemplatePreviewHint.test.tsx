import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkuTemplatePreviewHint } from "./SkuTemplatePreviewHint";

describe("SkuTemplatePreviewHint", () => {
  it("shows the previewed sku", () => {
    render(<SkuTemplatePreviewHint preview="RET-7" testId="hint" />);

    expect(screen.getByTestId("hint")).toHaveTextContent("≈ RET-7");
  });

  it("renders nothing without a preview", () => {
    render(<SkuTemplatePreviewHint preview={null} testId="hint" />);

    expect(screen.queryByTestId("hint")).not.toBeInTheDocument();
  });

  it("hides once the seller has typed an override", () => {
    render(<SkuTemplatePreviewHint hidden preview="RET-7" testId="hint" />);

    expect(screen.queryByTestId("hint")).not.toBeInTheDocument();
  });
});
