import { generateClientId } from '@/lib/client-id';

export function buildCompressedImageFileName(extension = 'webp'): string {
  return `${generateClientId('Image')}.${extension}`;
}
