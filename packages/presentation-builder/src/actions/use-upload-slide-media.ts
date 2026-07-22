import { ApiRequestError } from "@beyo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { confirmSlideMedia, createMediaUploadUrl } from "../api/media";
import { presentationKeys } from "../api/presentation-keys";
import { uploadToS3 } from "../api/upload-to-s3";
import type { MediaType, UploadSlideMediaInput } from "../types";

const MEDIA_CONSTRAINTS: Record<MediaType, { maxSizeBytes: number; contentTypes: readonly string[] }> = {
  image: {
    maxSizeBytes: 20 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  video: {
    maxSizeBytes: 200 * 1024 * 1024,
    contentTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
};

function validateUpload(input: UploadSlideMediaInput): void {
  const constraints = MEDIA_CONSTRAINTS[input.media_type];
  if (!constraints.contentTypes.includes(input.file.type)) {
    throw new ApiRequestError(422, "unprocessable", "The selected file type is not supported.");
  }
  if (input.file.size > constraints.maxSizeBytes) {
    throw new ApiRequestError(422, "unprocessable", "The selected file exceeds the allowed size.");
  }
}

export function useUploadSlideMedia() {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (input: UploadSlideMediaInput) => {
      validateUpload(input);
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setProgress(0);

      const upload = await createMediaUploadUrl({
        presentationId: input.presentationId,
        slideId: input.slideId,
        media_type: input.media_type,
        content_type: input.file.type,
        file_name: input.file.name,
        file_size_bytes: input.file.size,
      });

      await uploadToS3({
        uploadUrl: upload.upload_url,
        file: input.file,
        contentType: input.file.type,
        onProgress: setProgress,
        signal: abortController.signal,
      });

      return confirmSlideMedia({
        presentationId: input.presentationId,
        slideId: input.slideId,
        media_type: input.media_type,
        pending_upload_client_id: upload.pending_upload_client_id,
        alt_text: input.alt_text,
        mime_type: input.file.type,
        width: input.width,
        height: input.height,
        duration_ms: input.duration_ms,
        is_looping: input.is_looping,
      });
    },
    onSuccess: (presentation) => {
      queryClient.setQueryData(presentationKeys.detail(presentation.client_id), presentation);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const cancel = useCallback(() => abortControllerRef.current?.abort(), []);
  const reset = useCallback(() => {
    mutation.reset();
    setProgress(0);
  }, [mutation]);

  return {
    uploadSlideMedia: mutation.mutate,
    uploadSlideMediaAsync: mutation.mutateAsync,
    progress,
    cancel,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset,
  };
}
