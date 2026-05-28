import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildEntityImage,
  buildImage,
  createTestQueryClient,
  createTestWrapper,
} from "../test-utils";
import { buildEntityKey, useImagesStore } from "../store/images.store";

const {
  useEntityImagesQueryMock,
  runImageUploadPipelineMock,
  runImagePreUploadPipelineMock,
  confirmImageUploadMock,
  useSurfaceMock,
  useDeleteImageMock,
  useReorderImagesMock,
  useUnlinkImageMock,
  generateClientIdMock,
  deleteImageWithOptionsAsyncMock,
} = vi.hoisted(() => ({
  useEntityImagesQueryMock: vi.fn(),
  runImageUploadPipelineMock: vi.fn(),
  runImagePreUploadPipelineMock: vi.fn(),
  confirmImageUploadMock: vi.fn(),
  useSurfaceMock: vi.fn(),
  useDeleteImageMock: vi.fn(),
  useReorderImagesMock: vi.fn(),
  useUnlinkImageMock: vi.fn(),
  generateClientIdMock: vi.fn(),
  deleteImageWithOptionsAsyncMock: vi.fn(),
}));

vi.mock("../api/use-entity-images", () => ({
  useEntityImagesQuery: useEntityImagesQueryMock,
}));

vi.mock("../lib/image-upload-pipeline", () => ({
  runImageUploadPipeline: runImageUploadPipelineMock,
  runImagePreUploadPipeline: runImagePreUploadPipelineMock,
}));

vi.mock("../api/confirm-image-upload", () => ({
  confirmImageUpload: confirmImageUploadMock,
}));

vi.mock("../actions/use-delete-image", () => ({
  useDeleteImage: useDeleteImageMock,
}));

vi.mock("../actions/use-reorder-images", () => ({
  useReorderImages: useReorderImagesMock,
}));

vi.mock("../actions/use-unlink-image", () => ({
  useUnlinkImage: useUnlinkImageMock,
}));

vi.mock("@/hooks/use-surface", () => ({
  useSurface: useSurfaceMock,
}));

vi.mock("@/lib/client-id", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/client-id")>();
  return {
    ...actual,
    generateClientId: generateClientIdMock,
  };
});

import { useEntityImagesController } from "./use-entity-images.controller";

describe("useEntityImagesController", () => {
  const entityKey = buildEntityKey("item", "item_1");
  const revokeObjectURLMock = vi.fn();
  const createObjectURLMock = vi.fn();
  const unlinkImageAsyncMock = vi.fn();
  const openMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useImagesStore.setState({ optimisticImages: { [entityKey]: [] } });

    useEntityImagesQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    });
    useSurfaceMock.mockReturnValue({ open: openMock });
    useDeleteImageMock.mockReturnValue({
      deleteImageWithOptionsAsync: deleteImageWithOptionsAsyncMock,
      isPending: false,
    });
    useReorderImagesMock.mockReturnValue({ reorderImages: vi.fn() });
    useUnlinkImageMock.mockReturnValue({
      unlinkImageAsync: unlinkImageAsyncMock,
    });
    generateClientIdMock.mockReturnValue("optimistic_img_1");
    deleteImageWithOptionsAsyncMock.mockResolvedValue("img_deleted");
    runImagePreUploadPipelineMock.mockResolvedValue({
      pendingUploadClientId: "pending_1",
      widthPx: 640,
      heightPx: 480,
    });
    confirmImageUploadMock.mockResolvedValue(
      buildImage({ client_id: "optimistic_img_1" }),
    );

    createObjectURLMock.mockReturnValue("blob:optimistic");
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as unknown as typeof URL);
  });

  it("merges confirmed server images with pending optimistic images and removes duplicates", async () => {
    useImagesStore.setState({
      optimisticImages: {
        [entityKey]: [
          {
            clientId: "img_server",
            linkClientId: null,
            entityType: "item",
            entityClientId: "item_1",
            imageUrl: "https://cdn.example.com/image-server.webp",
            localObjectUrl: null,
            displayOrder: 5,
            widthPx: 800,
            heightPx: 800,
            fileSizeBytes: 500,
            createdAt: "2026-05-21T12:00:00.000Z",
            uploadState: "completed",
            isOptimistic: true,
            isDeleted: false,
            pendingUploadClientId: null,
            uploadError: null,
            annotation: null,
            annotations: [],
          },
          {
            clientId: "img_pending",
            linkClientId: null,
            entityType: "item",
            entityClientId: "item_1",
            imageUrl: "blob:pending",
            localObjectUrl: "blob:pending",
            displayOrder: 1,
            widthPx: null,
            heightPx: null,
            fileSizeBytes: 400,
            createdAt: "2026-05-21T12:00:00.000Z",
            uploadState: "uploading",
            isOptimistic: true,
            isDeleted: false,
            pendingUploadClientId: null,
            uploadError: null,
            annotation: null,
            annotations: [],
          },
        ],
      },
    });
    useEntityImagesQueryMock.mockReturnValue({
      data: [
        buildEntityImage({
          image: buildImage({
            client_id: "img_server",
            image_url: "https://cdn.example.com/image-server.webp",
          }),
          display_order: 0,
        }),
      ],
      isPending: false,
      isError: false,
    });

    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
        }),
      {
        wrapper: createTestWrapper(createTestQueryClient()),
      },
    );

    expect(result.current.images.map((image) => image.clientId)).toEqual([
      "img_server",
      "img_pending",
    ]);

    await waitFor(() => {
      expect(useImagesStore.getState().optimisticImages[entityKey]).toEqual([
        expect.objectContaining({ clientId: "img_pending" }),
      ]);
    });
  });

  it("cleans up and unlinks when an uploading image is deleted before confirmation finishes", async () => {
    let resolveUpload!: (image: ReturnType<typeof buildImage>) => void;
    runImageUploadPipelineMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
        }),
      {
        wrapper: createTestWrapper(queryClient),
      },
    );

    result.current.uploadImage(new Blob(["raw"], { type: "image/png" }));

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    result.current.deleteImage("optimistic_img_1");

    expect(useImagesStore.getState().optimisticImages[entityKey]?.[0]).toEqual(
      expect.objectContaining({
        isDeleted: true,
        uploadState: "delete_requested",
      }),
    );

    resolveUpload(buildImage({ client_id: "img_confirmed" }));

    await waitFor(() => {
      expect(useImagesStore.getState().optimisticImages[entityKey]).toEqual([]);
    });

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:optimistic");
    expect(unlinkImageAsyncMock).toHaveBeenCalledWith({
      image_client_id: "img_confirmed",
      entity_type: "item",
      entity_client_id: "item_1",
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("retries a failed optimistic upload with the original blob source", async () => {
    runImageUploadPipelineMock
      .mockRejectedValueOnce(new Error("Upload failed."))
      .mockResolvedValueOnce(buildImage({ client_id: "img_retried" }));

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
        }),
      {
        wrapper: createTestWrapper(queryClient),
      },
    );

    const sourceBlob = new Blob(["retry-source"], { type: "image/png" });

    result.current.uploadImage(sourceBlob);

    await waitFor(() => {
      expect(
        useImagesStore.getState().optimisticImages[entityKey]?.[0],
      ).toEqual(
        expect.objectContaining({
          clientId: "optimistic_img_1",
          uploadState: "failed",
          uploadError: "Upload failed.",
        }),
      );
    });

    result.current.retryImageUpload("optimistic_img_1");

    await waitFor(() => {
      expect(runImageUploadPipelineMock).toHaveBeenCalledTimes(2);
      expect(
        useImagesStore.getState().optimisticImages[entityKey]?.[0],
      ).toEqual(
        expect.objectContaining({
          clientId: "img_retried",
          uploadState: "completed",
          imageUrl: "https://cdn.example.com/image-1.webp",
          localObjectUrl: null,
          uploadError: null,
        }),
      );
    });

    expect(runImageUploadPipelineMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        rawBlob: sourceBlob,
      }),
    );
    expect(runImageUploadPipelineMock.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        rawBlob: sourceBlob,
      }),
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:optimistic");
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("passes direct capture flow props when opening the camera surface", () => {
    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
          captureFlow: "camera-to-editor",
        }),
      {
        wrapper: createTestWrapper(createTestQueryClient()),
      },
    );

    result.current.openCamera();

    expect(openMock).toHaveBeenCalledWith(
      "image-camera",
      expect.objectContaining({
        captureFlow: "camera-to-editor",
        onEditCapturedImage: expect.any(Function),
      }),
    );
  });

  it("stores deferred annotations and confirms once pre-upload finishes", async () => {
    let resolvePreUpload!: (value: {
      pendingUploadClientId: string;
      widthPx: number;
      heightPx: number;
    }) => void;
    runImagePreUploadPipelineMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreUpload = resolve;
        }),
    );

    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
          captureFlow: "camera-to-editor",
        }),
      {
        wrapper: createTestWrapper(createTestQueryClient()),
      },
    );

    result.current.openCamera();

    const cameraProps = openMock.mock.calls[0]?.[1];
    expect(cameraProps).toBeDefined();

    const capturedImage = cameraProps.onCapture(
      new Blob(["raw"], { type: "image/png" }),
    );
    cameraProps.onEditCapturedImage?.(capturedImage);

    const editorProps = openMock.mock.calls[1]?.[1];
    expect(editorProps).toBeDefined();

    editorProps.onDeferredConfirm([
      {
        tool: "text",
        x: 0.2,
        y: 0.3,
        text: "note",
        fontSize: 0.04,
        color: "#ffffff",
      },
    ]);

    expect(confirmImageUploadMock).not.toHaveBeenCalled();

    resolvePreUpload({
      pendingUploadClientId: "pending_1",
      widthPx: 640,
      heightPx: 480,
    });

    await waitFor(() => {
      expect(confirmImageUploadMock).toHaveBeenCalledWith({
        pending_upload_client_id: "pending_1",
        entity_type: "item",
        entity_client_id: "item_1",
        image_client_id: "optimistic_img_1",
        width_px: 640,
        height_px: 480,
        image_annotations: [
          {
            tool: "text",
            x: 0.2,
            y: 0.3,
            text: "note",
            fontSize: 0.04,
            color: "#ffffff",
          },
        ],
      });
    });

    expect(
      (confirmImageUploadMock.mock.calls[0]?.[0] as Record<string, unknown>)?.[
        "file_size_bytes"
      ],
    ).toBeUndefined();
  });

  it("moves deferred captures into pre_confirm when upload finishes before done", async () => {
    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
          captureFlow: "camera-to-editor",
        }),
      {
        wrapper: createTestWrapper(createTestQueryClient()),
      },
    );

    result.current.uploadImage(new Blob(["raw"], { type: "image/png" }));

    await waitFor(() => {
      expect(useImagesStore.getState().optimisticImages[entityKey]?.[0]).toEqual(
        expect.objectContaining({
          clientId: "optimistic_img_1",
          uploadState: "pre_confirm",
          pendingUploadClientId: "pending_1",
          widthPx: 640,
          heightPx: 480,
        }),
      );
    });

    expect(runImagePreUploadPipelineMock).toHaveBeenCalledTimes(1);
    expect(runImageUploadPipelineMock).not.toHaveBeenCalled();
    expect(confirmImageUploadMock).not.toHaveBeenCalled();
  });

  it("uses hard delete for completed images when deleteMode is configured as hard-delete", async () => {
    useEntityImagesQueryMock.mockReturnValue({
      data: [
        buildEntityImage({
          image: buildImage({
            client_id: "img_server",
            image_url: "https://cdn.example.com/image-server.webp",
          }),
          display_order: 0,
        }),
      ],
      isPending: false,
      isError: false,
    });

    const { result } = renderHook(
      () =>
        useEntityImagesController({
          entityType: "item",
          entityClientId: "item_1",
          deleteMode: "hard-delete",
        }),
      {
        wrapper: createTestWrapper(createTestQueryClient()),
      },
    );

    result.current.deleteImage("img_server");

    await waitFor(() => {
      expect(deleteImageWithOptionsAsyncMock).toHaveBeenCalledWith({
        imageClientId: "img_server",
        hardDelete: true,
      });
    });

    expect(unlinkImageAsyncMock).not.toHaveBeenCalled();
  });
});
