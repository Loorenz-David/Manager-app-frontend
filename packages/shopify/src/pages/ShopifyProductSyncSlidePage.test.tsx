import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShopifyProductSyncSlidePage } from "./ShopifyProductSyncSlidePage";

const {
  requestCloseMock,
  setHeaderHiddenMock,
  useSurfacePropsMock,
} = vi.hoisted(() => ({
  requestCloseMock: vi.fn(),
  setHeaderHiddenMock: vi.fn(),
  useSurfacePropsMock: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    requestClose: requestCloseMock,
    setHeaderHidden: setHeaderHiddenMock,
  }),
  useSurfaceProps: () => useSurfacePropsMock(),
}));

vi.mock("../components/ShopifyProductSyncForm", () => ({
  ShopifyProductSyncForm: () => <div>Shopify product sync form</div>,
}));

vi.mock("../providers/ShopifyProductSyncFormProvider", () => ({
  ShopifyProductSyncFormProvider: ({
    children,
    onCompleted,
    onSkipped,
  }: {
    children: React.ReactNode;
    onCompleted?: () => void;
    onSkipped?: () => void;
  }) => (
    <>
      <button onClick={onCompleted} type="button">
        Complete
      </button>
      <button onClick={onSkipped} type="button">
        Skip
      </button>
      {children}
    </>
  ),
}));

describe("ShopifyProductSyncSlidePage", () => {
  const onCompleted = vi.fn();
  const onSkipped = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSurfacePropsMock.mockReturnValue({
      itemClientId: "item_1",
      onCompleted,
      onSkipped,
    });
  });

  afterEach(cleanup);

  it("closes the sync slide before continuing after a successful queue", async () => {
    const user = userEvent.setup();
    render(<ShopifyProductSyncSlidePage />);

    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(requestCloseMock).toHaveBeenCalledOnce();
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(requestCloseMock.mock.invocationCallOrder[0]).toBeLessThan(
      onCompleted.mock.invocationCallOrder[0],
    );
  });

  it("closes the sync slide before continuing after a skip", async () => {
    const user = userEvent.setup();
    render(<ShopifyProductSyncSlidePage />);

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(requestCloseMock).toHaveBeenCalledOnce();
    expect(onSkipped).toHaveBeenCalledOnce();
  });
});
