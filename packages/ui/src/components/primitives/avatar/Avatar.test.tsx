import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Avatar } from "./Avatar";

describe("Avatar", () => {
  afterEach(cleanup);

  it("renders the supplied profile image", () => {
    render(
      <Avatar
        data-testid="avatar"
        imageSrc="https://example.test/profile.jpg"
        name="Test Seller"
      />,
    );

    expect(screen.getByRole("img", { name: "Test Seller" })).toHaveAttribute(
      "src",
      "https://example.test/profile.jpg",
    );
  });

  it("falls back to up-to-two initials after an image error", () => {
    render(
      <Avatar
        data-testid="avatar"
        imageSrc="https://example.test/profile.jpg"
        name="#test-seller"
      />,
    );

    fireEvent.error(screen.getByRole("img"));

    expect(screen.getByTestId("avatar")).toHaveTextContent("TS");
  });

  it("uses the placeholder when neither a name nor image is available", () => {
    const { container } = render(<Avatar data-testid="avatar" name="" />);

    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
