import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BackendImage } from "./BackendImage";

afterEach(cleanup);

describe("BackendImage", () => {
  it("renders the placeholder when src is missing", () => {
    render(<BackendImage src={null} data-testid="img" />);

    expect(screen.queryByTestId("img")).toBeNull();
    // ImagePlaceholder renders a decorative container (aria-hidden), no <img>.
    expect(document.querySelector("img")).toBeNull();
  });

  it("renders a custom fallback when provided and src is missing", () => {
    render(
      <BackendImage src={undefined} fallback={<span>no image</span>} />,
    );

    expect(screen.getByText("no image")).toBeTruthy();
  });

  it("renders the image for a first (previously empty) src", () => {
    render(<BackendImage src="https://cdn.test/a.jpg" data-testid="img" />);

    const img = screen.getByTestId("img") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("https://cdn.test/a.jpg");
  });

  it("applies img defaults and passes through arbitrary props", () => {
    render(
      <BackendImage
        src="https://cdn.test/a.jpg"
        data-testid="img"
        className="size-full object-cover"
      />,
    );

    const img = screen.getByTestId("img") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.className).toContain("object-cover");
  });

  it("shows a shimmer and hides the first image until it has decoded", async () => {
    let resolveDecode: (() => void) | undefined;
    (HTMLImageElement.prototype as unknown as { decode: () => Promise<void> }).decode =
      () =>
        new Promise<void>((resolve) => {
          resolveDecode = resolve;
        });

    render(<BackendImage src="https://cdn.test/a.jpg" data-testid="img" />);

    const img = screen.getByTestId("img") as HTMLImageElement;
    expect(document.querySelector("[data-backend-image-skeleton]")).not.toBeNull();
    expect(img.style.opacity).toBe("0");

    fireEvent.load(img);
    expect(document.querySelector("[data-backend-image-skeleton]")).not.toBeNull();

    resolveDecode?.();
    await waitFor(() => {
      expect(document.querySelector("[data-backend-image-skeleton]")).toBeNull();
      expect(img.style.opacity).toBe("");
    });

    delete (HTMLImageElement.prototype as unknown as { decode?: unknown }).decode;
  });

  it("falls back to the placeholder after a load error", async () => {
    render(<BackendImage src="https://cdn.test/broken.jpg" data-testid="img" />);

    const img = screen.getByTestId("img") as HTMLImageElement;
    img.dispatchEvent(new Event("error"));

    await waitFor(() => {
      expect(screen.queryByTestId("img")).toBeNull();
    });
  });

  it("keeps the previous image on screen until the new src decodes (swap-on-decode)", async () => {
    let resolveDecode: (() => void) | undefined;
    // jsdom does not implement HTMLImageElement.decode; define it, then control it.
    (HTMLImageElement.prototype as unknown as { decode: () => Promise<void> }).decode =
      () =>
        new Promise<void>((resolve) => {
          resolveDecode = resolve;
        });

    const { rerender } = render(
      <BackendImage src="https://cdn.test/old.jpg" data-testid="img" />,
    );
    expect(
      (screen.getByTestId("img") as HTMLImageElement).getAttribute("src"),
    ).toBe("https://cdn.test/old.jpg");

    // New src: old image must remain until the preload decodes.
    rerender(<BackendImage src="https://cdn.test/new.jpg" data-testid="img" />);
    expect(
      (screen.getByTestId("img") as HTMLImageElement).getAttribute("src"),
    ).toBe("https://cdn.test/old.jpg");

    resolveDecode?.();
    await waitFor(() => {
      expect(
        (screen.getByTestId("img") as HTMLImageElement).getAttribute("src"),
      ).toBe("https://cdn.test/new.jpg");
    });

    delete (HTMLImageElement.prototype as unknown as { decode?: unknown }).decode;
  });
});
