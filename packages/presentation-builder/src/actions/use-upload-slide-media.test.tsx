import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { presentationKeys } from "../api/presentation-keys";
import { envelope, fullPresentationFixture } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";
import { useUploadSlideMedia } from "./use-upload-slide-media";

const API_PATTERN = "*/api/v1/app-update-presentations";
const UPLOAD_URL = "https://uploads.example.test/presentation.mp4";

function uploadInput() {
  return {
    presentationId: fullPresentationFixture.client_id,
    slideId: fullPresentationFixture.slides[0].client_id,
    file: new File(["video bytes"], "presentation.mp4", { type: "video/mp4" }),
    media_type: "video" as const,
    duration_ms: 8_000,
    is_looping: false,
  };
}

describe("useUploadSlideMedia", () => {
  it("runs upload-url, S3 PUT, and confirm in order and writes the detail cache", async () => {
    const calls: string[] = [];
    server.use(
      http.post(`${API_PATTERN}/:id/slides/:slideId/media/upload-url`, () => {
        calls.push("upload-url");
        return HttpResponse.json(
          envelope({
            upload_url: UPLOAD_URL,
            pending_upload_client_id: "pu_01JPENDING",
            storage_key: "app_update_presentations/ws/aup/aups/file.mp4",
            expires_in: 900,
          }),
        );
      }),
      http.put(UPLOAD_URL, () => {
        calls.push("s3");
        return new HttpResponse(null, { status: 200 });
      }),
      http.post(`${API_PATTERN}/:id/slides/:slideId/media`, () => {
        calls.push("confirm");
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { queryClient, Wrapper } = createTestContext();
    const { result } = renderHook(() => useUploadSlideMedia(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.uploadSlideMediaAsync(uploadInput());
    });
    expect(calls).toEqual(["upload-url", "s3", "confirm"]);
    expect(result.current.progress).toBe(100);
    expect(queryClient.getQueryData(presentationKeys.detail(fullPresentationFixture.client_id))).toEqual(
      fullPresentationFixture,
    );
  });

  it("does not confirm when the S3 step fails", async () => {
    const confirm = vi.fn();
    server.use(
      http.post(`${API_PATTERN}/:id/slides/:slideId/media/upload-url`, () =>
        HttpResponse.json(
          envelope({
            upload_url: UPLOAD_URL,
            pending_upload_client_id: "pu_01JPENDING",
            storage_key: "app_update_presentations/ws/aup/aups/file.mp4",
            expires_in: 900,
          }),
        ),
      ),
      http.put(UPLOAD_URL, () => new HttpResponse(null, { status: 500 })),
      http.post(`${API_PATTERN}/:id/slides/:slideId/media`, () => {
        confirm();
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => useUploadSlideMedia(), { wrapper: Wrapper });
    await act(async () => {
      await expect(result.current.uploadSlideMediaAsync(uploadInput())).rejects.toThrow("Upload failed");
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(confirm).not.toHaveBeenCalled();
  });
});
