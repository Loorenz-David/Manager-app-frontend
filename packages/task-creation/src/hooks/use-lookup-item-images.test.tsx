// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLookupItemImages } from "./use-lookup-item-images";

const createImagesFromUrlMock = vi.fn();
const deleteImageMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock("@beyo/images", () => ({
  imageKeys: {
    list: (params: unknown) => ["images", "list", params],
  },
  useCreateImagesFromUrl: () => ({ mutateAsync: createImagesFromUrlMock }),
  useDeleteImage: () => ({ deleteImageWithOptionsAsync: deleteImageMock }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

/** Resolves only when `release()` is called, to hold a batch mid-flight. */
function deferred<T>() {
  let release!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function createdImages(...clientIds: string[]) {
  return clientIds.map((client_id) => ({
    client_id,
    image_url: `https://cdn.test/${client_id}.jpg`,
  }));
}

function deletedIds(): string[] {
  return deleteImageMock.mock.calls.map((call) => call[0].imageClientId);
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteImageMock.mockResolvedValue(undefined);
});

describe("useLookupItemImages", () => {
  it("drops the previous lookup's images when a new article number is applied", async () => {
    createImagesFromUrlMock
      .mockResolvedValueOnce(createdImages("img-a1", "img-a2"))
      .mockResolvedValueOnce(createdImages("img-b1"));

    const { result } = renderHook(() => useLookupItemImages("item-1"));

    await act(async () => {
      result.current(["https://purchase.test/a1.jpg"]);
    });
    expect(deletedIds()).toEqual([]);

    await act(async () => {
      result.current(["https://purchase.test/b1.jpg"]);
    });

    await waitFor(() => {
      expect(deletedIds()).toEqual(["img-a1", "img-a2"]);
    });
  });

  it("deletes a superseded batch that finishes uploading after the newer one", async () => {
    const slowFirstBatch = deferred<ReturnType<typeof createdImages>>();
    createImagesFromUrlMock
      .mockReturnValueOnce(slowFirstBatch.promise)
      .mockResolvedValueOnce(createdImages("img-new"));

    const { result } = renderHook(() => useLookupItemImages("item-1"));

    act(() => {
      result.current(["https://purchase.test/stale.jpg"]);
    });
    await act(async () => {
      result.current(["https://purchase.test/current.jpg"]);
    });

    // The stale upload only lands now, after the corrected one already applied.
    await act(async () => {
      slowFirstBatch.release(createdImages("img-stale"));
    });

    await waitFor(() => {
      expect(deletedIds()).toEqual(["img-stale"]);
    });
  });

  it("clears prefilled images when the new lookup has none of its own", async () => {
    createImagesFromUrlMock.mockResolvedValueOnce(createdImages("img-a1"));

    const { result } = renderHook(() => useLookupItemImages("item-1"));

    await act(async () => {
      result.current(["https://purchase.test/a1.jpg"]);
    });
    await act(async () => {
      result.current([]);
    });

    await waitFor(() => {
      expect(deletedIds()).toEqual(["img-a1"]);
    });
    expect(createImagesFromUrlMock).toHaveBeenCalledTimes(1);
  });

  it("leaves images alone once the form moved on to a fresh draft item", async () => {
    const slowBatch = deferred<ReturnType<typeof createdImages>>();
    createImagesFromUrlMock.mockReturnValueOnce(slowBatch.promise);

    const { result, rerender } = renderHook(
      ({ itemClientId }) => useLookupItemImages(itemClientId),
      { initialProps: { itemClientId: "item-1" } },
    );

    act(() => {
      result.current(["https://purchase.test/a1.jpg"]);
    });

    // Task submitted: the provider hands the form a regenerated item id.
    rerender({ itemClientId: "item-2" });

    await act(async () => {
      slowBatch.release(createdImages("img-submitted"));
    });

    expect(deletedIds()).toEqual([]);
  });

  it("hard-deletes, so discarded prefills do not linger", async () => {
    createImagesFromUrlMock
      .mockResolvedValueOnce(createdImages("img-a1"))
      .mockResolvedValueOnce(createdImages("img-b1"));

    const { result } = renderHook(() => useLookupItemImages("item-1"));

    await act(async () => {
      result.current(["https://purchase.test/a1.jpg"]);
    });
    await act(async () => {
      result.current(["https://purchase.test/b1.jpg"]);
    });

    await waitFor(() => {
      expect(deleteImageMock).toHaveBeenCalledWith({
        imageClientId: "img-a1",
        hardDelete: true,
      });
    });
  });
});
