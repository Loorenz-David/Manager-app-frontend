import { forwardRef, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildImageViewModel } from "../test-utils";
import { IMAGE_EDITOR_SURFACE_ID } from "../surfaces";

const {
  useSurfaceMock,
  useSurfaceHeaderMock,
  useSurfacePropsMock,
  useImageQueryMock,
  createAnnotationAsyncMock,
  deleteAnnotationAsyncMock,
  updateAnnotationMock,
  closeMock,
} = vi.hoisted(() => ({
  useSurfaceMock: vi.fn(),
  useSurfaceHeaderMock: vi.fn(),
  useSurfacePropsMock: vi.fn(),
  useImageQueryMock: vi.fn(),
  createAnnotationAsyncMock: vi.fn(),
  deleteAnnotationAsyncMock: vi.fn(),
  updateAnnotationMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock("@/hooks/use-surface", () => ({
  useSurface: useSurfaceMock,
}));

vi.mock("@/hooks/use-surface-header", () => ({
  useSurfaceHeader: useSurfaceHeaderMock,
}));

vi.mock("@/hooks/use-surface-props", () => ({
  useSurfaceProps: useSurfacePropsMock,
}));

vi.mock("@/providers/SurfaceProvider", () => ({
  useSurfaceStore: {
    getState: () => ({
      close: closeMock,
    }),
  },
}));

vi.mock("../api/use-image", () => ({
  useImageQuery: useImageQueryMock,
}));

vi.mock("../actions/use-create-image-annotation", () => ({
  useCreateImageAnnotation: () => ({
    createAnnotationAsync: createAnnotationAsyncMock,
    isPending: false,
  }),
}));

vi.mock("../actions/use-delete-image-annotation", () => ({
  useDeleteImageAnnotation: () => ({
    deleteAnnotationAsync: deleteAnnotationAsyncMock,
  }),
}));

vi.mock("../actions/use-update-image-annotation", () => ({
  useUpdateImageAnnotation: () => ({
    updateAnnotation: updateAnnotationMock,
  }),
}));

vi.mock("../components/ImageAnnotationCanvas", () => ({
  ImageAnnotationCanvas: forwardRef(function MockImageAnnotationCanvas(_, _ref) {
    return <div data-testid="image-annotation-canvas" />;
  }),
}));

vi.mock("../components/ZoomableEditorStage", () => ({
  ZoomableEditorStage: ({ children }: { children: ReactNode }) => (
    <div data-testid="zoomable-editor-stage">{children}</div>
  ),
}));

import { ImageEditorPage } from "./ImageEditorPage";

describe("ImageEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSurfaceMock.mockReturnValue({ open: vi.fn() });
    useImageQueryMock.mockReturnValue({ data: undefined });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it("routes the slide close interceptor through hard-delete cancel for direct captures", async () => {
    const onCancelCapture = vi.fn();
    const setCloseInterceptor = vi.fn();

    useSurfaceHeaderMock.mockReturnValue({
      setTitle: vi.fn(),
      setActions: vi.fn(),
      requestClose: vi.fn(),
      setHeaderHidden: vi.fn(),
      setCloseInterceptor,
    });
    useSurfacePropsMock.mockReturnValue({
      image: buildImageViewModel({
        clientId: "img_direct_capture",
        localObjectUrl: "blob:direct-capture",
        imageUrl: "blob:direct-capture",
      }),
      isDirectCaptureSession: true,
      onCancelCapture,
    });

    render(<ImageEditorPage />);

    const interceptor = setCloseInterceptor.mock.calls[0]?.[0] as
      | (() => void)
      | undefined;

    expect(interceptor).toBeTypeOf("function");

    await act(async () => {
      interceptor?.();
      await Promise.resolve();
    });

    expect(onCancelCapture).toHaveBeenCalledWith("img_direct_capture");
    await waitFor(() => {
      expect(closeMock).toHaveBeenCalledWith(IMAGE_EDITOR_SURFACE_ID);
    });
  });
});
