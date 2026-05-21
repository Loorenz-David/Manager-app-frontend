import { lazy } from 'react';

import { prewarmCameraStream } from './hooks/use-camera-stream';
import {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
} from './controllers/use-entity-images.controller';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

const preloadedImageSurfaces = new Set<string>();

function loadImageCameraPage() {
  return import('@/features/images/pages/ImageCameraPage').then((module) => ({
    default: module.ImageCameraPage,
  }));
}

function loadImageFullscreenViewerPage() {
  return import('@/features/images/pages/ImageFullscreenViewerPage').then((module) => ({
    default: module.ImageFullscreenViewerPage,
  }));
}

function loadImageMetadataActionsSheetPage() {
  return import('@/features/images/pages/ImageMetadataActionsSheetPage').then((module) => ({
    default: module.ImageMetadataActionsSheetPage,
  }));
}

function loadImageEditorPage() {
  return import('@/features/images/pages/ImageEditorPage').then((module) => ({
    default: module.ImageEditorPage,
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
  [IMAGE_VIEWER_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(loadImageFullscreenViewerPage),
  },
  [IMAGE_METADATA_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadImageMetadataActionsSheetPage),
  },
  [IMAGE_EDITOR_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(loadImageEditorPage),
  },
};
