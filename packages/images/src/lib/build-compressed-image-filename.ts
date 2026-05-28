import { generateClientId } from '@beyo/lib';

export function buildCompressedImageFileName(extension = 'webp'): string {
  return `${generateClientId('Image')}.${extension}`;
}
