export function buildCompressedImageFileName(extension = 'webp'): string {
  return `img_${crypto.randomUUID()}.${extension}`;
}
