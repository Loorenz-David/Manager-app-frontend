import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FulfilmentBar } from "./FulfilmentBar";

afterEach(cleanup);

describe("FulfilmentBar", () => {
  it("puts each number inside its own segment and no labels anywhere", () => {
    render(
      <FulfilmentBar
        data-testid="bar"
        quantities={{ requested: 30, fulfilled: 8, inProgress: 4, inQueue: 0 }}
      />,
    );

    expect(screen.getByTestId("bar-fulfilled")).toHaveTextContent("8");
    expect(screen.getByTestId("bar-in-progress")).toHaveTextContent("4");
    expect(screen.getByTestId("bar-remaining")).toHaveTextContent("18");
    expect(screen.getByTestId("bar")).not.toHaveTextContent("Fulfilled");
  });

  it("renders queued work as its own segment, after in progress", () => {
    render(
      <FulfilmentBar
        data-testid="bar"
        quantities={{ requested: 30, fulfilled: 8, inProgress: 4, inQueue: 6 }}
      />,
    );

    expect(screen.getByTestId("bar-in-queue")).toHaveTextContent("6");
    expect(screen.getByTestId("bar-remaining")).toHaveTextContent("12");

    const order = Array.from(
      screen.getByTestId("bar").querySelectorAll("[data-testid]"),
    ).map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual([
      "bar-fulfilled",
      "bar-in-progress",
      "bar-in-queue",
      "bar-remaining",
    ]);
  });

  it("renders nothing at all for a zero segment", () => {
    render(
      <FulfilmentBar
        data-testid="bar"
        quantities={{ requested: 16, fulfilled: 0, inProgress: 6, inQueue: 0 }}
      />,
    );

    expect(screen.queryByTestId("bar-fulfilled")).not.toBeInTheDocument();
    expect(screen.getByTestId("bar-in-progress")).toHaveTextContent("6");
    expect(screen.getByTestId("bar-remaining")).toHaveTextContent("10");
  });

  it("drops the remainder once nothing is left to fulfil", () => {
    render(
      <FulfilmentBar
        data-testid="bar"
        quantities={{ requested: 30, fulfilled: 30, inProgress: 0, inQueue: 0 }}
      />,
    );

    expect(screen.queryByTestId("bar-remaining")).not.toBeInTheDocument();
    expect(screen.getByTestId("bar-fulfilled")).toHaveStyle({ width: "100%" });
  });

  it("gives the coloured pair only its budget while anything remains", () => {
    render(
      <FulfilmentBar
        data-testid="bar"
        quantities={{ requested: 30, fulfilled: 28, inProgress: 1, inQueue: 0 }}
      />,
    );

    const widths = ["bar-fulfilled", "bar-in-progress"].map((testId) =>
      Number.parseFloat(
        screen.getByTestId(testId).style.width.replace("%", ""),
      ),
    );

    expect(widths[0] + widths[1]).toBeCloseTo(84, 4);
    expect(screen.getByTestId("bar-remaining")).toHaveTextContent("1");
  });
});
