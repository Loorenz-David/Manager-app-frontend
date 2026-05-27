import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildEntityImage,
  buildImage,
  createTestQueryClient,
  createTestWrapper,
} from "../test-utils";
import { imageKeys } from "../api/image-keys";

const { deleteImageMock } = vi.hoisted(() => ({
  deleteImageMock: vi.fn(),
}));

vi.mock("../api/delete-image", () => ({
  deleteImage: deleteImageMock,
}));

import { useDeleteImage } from "./use-delete-image";

describe("useDeleteImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically removes the image from every list and clears the detail query", async () => {
    deleteImageMock.mockResolvedValue("img_1");
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const removeQueriesSpy = vi.spyOn(queryClient, "removeQueries");
    const itemKey = imageKeys.list({
      entity_type: "item",
      entity_client_id: "item_1",
    });
    const caseKey = imageKeys.list({
      entity_type: "case",
      entity_client_id: "case_1",
    });

    queryClient.setQueryData(itemKey, [
      buildEntityImage({ image: buildImage({ client_id: "img_1" }) }),
      buildEntityImage({
        link_client_id: "link_2",
        image: buildImage({ client_id: "img_2" }),
      }),
    ]);
    queryClient.setQueryData(caseKey, [
      buildEntityImage({
        entity_type: "case",
        entity_client_id: "case_1",
        image: buildImage({ client_id: "img_1" }),
      }),
    ]);

    const { result } = renderHook(() => useDeleteImage(), {
      wrapper: createTestWrapper(queryClient),
    });

    await result.current.deleteImageAsync("img_1");
    expect(deleteImageMock).toHaveBeenCalledWith(
      { imageClientId: "img_1" },
      expect.any(Object),
    );

    expect(
      queryClient
        .getQueryData<ReturnType<typeof buildEntityImage>[]>(itemKey)
        ?.map((entry) => entry.image.client_id),
    ).toEqual(["img_2"]);
    expect(
      queryClient.getQueryData<ReturnType<typeof buildEntityImage>[]>(caseKey),
    ).toEqual([]);

    await waitFor(() => {
      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: imageKeys.detail("img_1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: imageKeys.lists(),
      });
    });
  });

  it("rolls back all lists on error", async () => {
    deleteImageMock.mockRejectedValue(new Error("delete failed"));
    const queryClient = createTestQueryClient();
    const itemKey = imageKeys.list({
      entity_type: "item",
      entity_client_id: "item_1",
    });
    const caseKey = imageKeys.list({
      entity_type: "case",
      entity_client_id: "case_1",
    });

    queryClient.setQueryData(itemKey, [
      buildEntityImage({ image: buildImage({ client_id: "img_1" }) }),
      buildEntityImage({
        link_client_id: "link_2",
        image: buildImage({ client_id: "img_2" }),
      }),
    ]);
    queryClient.setQueryData(caseKey, [
      buildEntityImage({
        entity_type: "case",
        entity_client_id: "case_1",
        image: buildImage({ client_id: "img_1" }),
      }),
    ]);

    const { result } = renderHook(() => useDeleteImage(), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(result.current.deleteImageAsync("img_1")).rejects.toThrow(
      "delete failed",
    );
    expect(deleteImageMock).toHaveBeenCalledWith(
      { imageClientId: "img_1" },
      expect.any(Object),
    );

    expect(
      queryClient
        .getQueryData<ReturnType<typeof buildEntityImage>[]>(itemKey)
        ?.map((entry) => entry.image.client_id),
    ).toEqual(["img_1", "img_2"]);
    expect(
      queryClient
        .getQueryData<ReturnType<typeof buildEntityImage>[]>(caseKey)
        ?.map((entry) => entry.image.client_id),
    ).toEqual(["img_1"]);
  });

  it("forwards hard delete options when requested", async () => {
    deleteImageMock.mockResolvedValue("img_1");

    const { result } = renderHook(() => useDeleteImage(), {
      wrapper: createTestWrapper(createTestQueryClient()),
    });

    await result.current.deleteImageWithOptionsAsync({
      imageClientId: "img_1",
      hardDelete: true,
    });

    expect(deleteImageMock).toHaveBeenCalledWith(
      { imageClientId: "img_1", hardDelete: true },
      expect.any(Object),
    );
  });
});
