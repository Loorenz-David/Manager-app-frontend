import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LazyMotion, domAnimation } from "framer-motion";

import {
  AnimatedRemovalGroup,
  AnimatedRemovalItem,
} from "./AnimatedRemoval";

// The apps load LazyMotion with domAnimation at their root; `m` components
// only animate (incl. exit) with those features present, so the test must
// mirror that setup.
function List({ ids }: { ids: string[] }): React.JSX.Element {
  return (
    <LazyMotion features={domAnimation}>
      <div>
        <AnimatedRemovalGroup>
          {ids.map((id) => (
            <AnimatedRemovalItem key={id}>
              <div data-testid={`row-${id}`}>{id}</div>
            </AnimatedRemovalItem>
          ))}
        </AnimatedRemovalGroup>
      </div>
    </LazyMotion>
  );
}

afterEach(cleanup);

describe("AnimatedRemoval", () => {
  it("keeps a removed row mounted for its exit animation, then removes it", async () => {
    const { rerender } = render(<List ids={["a", "b", "c"]} />);
    expect(screen.getByTestId("row-b")).toBeDefined();

    rerender(<List ids={["a", "c"]} />);

    // Exit in progress: the removed row is still in the DOM (this is what
    // turns the old instant pop into a slide-out).
    expect(screen.queryByTestId("row-b")).not.toBeNull();

    // And it fully unmounts once the exit finishes.
    await waitFor(() => expect(screen.queryByTestId("row-b")).toBeNull(), {
      timeout: 3000,
    });

    // Survivors untouched.
    expect(screen.getByTestId("row-a")).toBeDefined();
    expect(screen.getByTestId("row-c")).toBeDefined();
  });

  it("renders rows without animation wrappers interfering at rest", () => {
    render(<List ids={["a"]} />);
    const row = screen.getByTestId("row-a");
    // No overflow clipping at rest (shadows must not be cut off).
    const wrapper = row.parentElement?.parentElement;
    expect(wrapper?.style.overflow ?? "").not.toBe("hidden");
  });
});
