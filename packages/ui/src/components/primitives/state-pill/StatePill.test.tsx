import { cleanup, render, screen } from "@testing-library/react";
import { RotateCcw } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { StatePill } from "./StatePill";

afterEach(cleanup);

describe("StatePill", () => {
  it("renders an optional leading icon", () => {
    render(
      <StatePill
        icon={RotateCcw}
        label="Retry available"
        variant="danger"
      />,
    );

    expect(screen.getByText("Retry available")).not.toBeNull();
    expect(screen.getByTestId("state-pill-icon")).not.toBeNull();
  });

  it("does not add icon markup by default", () => {
    render(<StatePill label="Ready" variant="success" />);

    expect(screen.queryByTestId("state-pill-icon")).toBeNull();
  });
});
