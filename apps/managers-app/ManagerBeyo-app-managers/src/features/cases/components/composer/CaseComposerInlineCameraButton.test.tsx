import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { openCameraMock, preloadImageCameraSurfaceMock } = vi.hoisted(() => ({
  openCameraMock: vi.fn(),
  preloadImageCameraSurfaceMock: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/features/images/providers/EntityImagesProvider", () => ({
  useEntityImagesContext: () => ({
    openCamera: openCameraMock,
  }),
}));

vi.mock("@/features/images/surfaces", () => ({
  preloadImageCameraSurface: preloadImageCameraSurfaceMock,
}));

import { CaseComposerInlineCameraButton } from "./CaseComposerInlineCameraButton";

describe("CaseComposerInlineCameraButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the camera when pressed", async () => {
    const user = userEvent.setup();

    render(<CaseComposerInlineCameraButton />);

    await user.click(screen.getByRole("button", { name: "Take picture" }));

    expect(openCameraMock).toHaveBeenCalledOnce();
  });

  it("preloads the camera surface on intent signals", () => {
    render(<CaseComposerInlineCameraButton />);

    const button = screen.getByRole("button", { name: "Take picture" });
    fireEvent.focus(button);
    fireEvent.pointerEnter(button);
    fireEvent.touchStart(button);

    expect(preloadImageCameraSurfaceMock).toHaveBeenCalledTimes(3);
  });
});
