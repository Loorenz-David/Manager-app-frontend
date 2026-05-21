import { lazy } from 'react';

import { prewarmCameraStream } from './hooks/use-camera-stream';
import { IMAGE_CAMERA_SURFACE_ID } from './controllers/use-entity-images.controller';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

const preloadedImageSurfaces = new Set<string>();

function loadImageCameraPage() {
  return import('@/features/images/pages/ImageCameraPage').then((module) => ({
    default: module.ImageCameraPage,
  }));
}

export function preloadImageCameraSurface(): Promise<unknown> {
  if (preloadedImageSurfaces.has(IMAGE_CAMERA_SURFACE_ID)) {
    return prewarmCameraStream();
  }

  preloadedImageSurfaces.add(IMAGE_CAMERA_SURFACE_ID);

  return Promise.allSettled([loadImageCameraPage(), prewarmCameraStream()]);
}

export const imageSurfaces: SurfaceRegistrations = {
  [IMAGE_CAMERA_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(loadImageCameraPage),
  },
};
