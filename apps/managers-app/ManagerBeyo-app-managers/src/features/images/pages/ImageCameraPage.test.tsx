import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildImageViewModel } from "../test-utils";

const {
  useSurfacePropsMock,
  useSurfaceHeaderMock,
  useCameraStreamMock,
  createObjectURLMock,
  revokeObjectURLMock,
} = vi.hoisted(() => ({
  useSurfacePropsMock: vi.fn(),
  useSurfaceHeaderMock: vi.fn(),
  useCameraStreamMock: vi.fn(),
  createObjectURLMock: vi.fn(),
  revokeObjectURLMock: vi.fn(),
}));

vi.mock("@/hooks/use-surface-props", () => ({
  useSurfaceProps: useSurfacePropsMock,
}));

vi.mock("@/hooks/use-surface-header", () => ({
  useSurfaceHeader: useSurfaceHeaderMock,
}));

vi.mock("../hooks/use-camera-stream", () => ({
  useCameraStream: useCameraStreamMock,
}));

import { ImageCameraPage } from "./ImageCameraPage";

describe("ImageCameraPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLMock.mockReturnValue("blob:latest-thumb");
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as unknown as typeof URL);

    useSurfaceHeaderMock.mockReturnValue({
      setTitle: vi.fn(),
      setHeaderHidden: vi.fn(),
      requestClose: vi.fn(),
    });

    useCameraStreamMock.mockReturnValue({
      videoRef: { current: null },
      isReady: true,
      hasError: false,
      startStream: vi.fn(),
      captureFrame: vi.fn().mockResolvedValue(
        new Blob(["raw"], { type: "image/png" }),
      ),
    });
  });

  it("does not keep a local latest thumbnail in camera-to-editor flow", async () => {
    const user = userEvent.setup();

    useSurfacePropsMock.mockReturnValue({
      entityType: "item",
      entityClientId: "item_1",
      onCapture: vi.fn(() =>
        buildImageViewModel({
          clientId: "img_optimistic_1",
          imageUrl: "blob:optimistic-image",
          localObjectUrl: "blob:optimistic-image",
        }),
      ),
      captureFlow: "camera-to-editor",
      latestImageUrl: undefined,
      onViewLatest: vi.fn(),
      onEditCapturedImage: vi.fn(),
    });

    render(<ImageCameraPage />);

    await user.click(screen.getByTestId("camera-capture-button"));

    await waitFor(() => {
      expect(screen.queryByAltText("Latest capture")).not.toBeInTheDocument();
    });

    expect(createObjectURLMock).not.toHaveBeenCalled();
  });
});
