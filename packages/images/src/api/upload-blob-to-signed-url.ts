export type UploadBlobToSignedUrlInput = {
  uploadUrl: string;
  blob: Blob;
  contentType: string;
};

export async function uploadBlobToSignedUrl(input: UploadBlobToSignedUrlInput): Promise<void> {
  const response = await fetch(input.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': input.contentType,
    },
    body: input.blob,
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed with status ${response.status}`);
  }
}
