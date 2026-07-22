import { ApiRequestError } from "@beyo/api-client";
import type { UploadToS3Input } from "../types";

export function uploadToS3({
  uploadUrl,
  file,
  contentType,
  onProgress,
  signal,
}: UploadToS3Input): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const handleAbortSignal = () => xhr.abort();
    signal?.addEventListener("abort", handleAbortSignal, { once: true });

    const cleanup = () => signal?.removeEventListener("abort", handleAbortSignal);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new ApiRequestError(xhr.status, "upload_failed", `Upload failed: ${xhr.statusText}`));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiRequestError(0, "network_error", "Upload failed: network error."));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}
