import { lazy } from 'react';

import { prewarmCameraStream } from './hooks/use-camera-stream';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import type { AnnotatedCanvasItem, ImageAnnotationTool } from './types';

export const IMAGE_CAMERA_SURFACE_ID = 'image-camera';
export const IMAGE_VIEWER_SURFACE_ID = 'image-viewer';
export const IMAGE_METADATA_SURFACE_ID = 'image-metadata';
export const IMAGE_EDITOR_SURFACE_ID = 'image-editor';
export const IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID = 'image-annotation-tool-picker';
export const IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID = 'image-editor-discard-changes';
export const IMAGE_ANNOTATION_ACTIONS_SURFACE_ID = 'image-annotation-actions';

export type ImageAnnotationToolPickerSurfaceProps = {
  activeTool: ImageAnnotationTool;
  onSelect: (tool: ImageAnnotationTool) => void;
};

export type ImageEditorDiscardChangesSurfaceProps = {
  onDiscardAndClose: () => void;
  onSaveAndClose: () => void;
};

export type ImageAnnotationActionsSurfaceProps = {
  item: AnnotatedCanvasItem;
  onDelete: () => void;
  onEditText?: () => void;
  onMoveText?: () => void;
};

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

function loadImageAnnotationToolPickerSheetPage() {
  return import('@/features/images/pages/ImageAnnotationToolPickerSheetPage').then((module) => ({
    default: module.ImageAnnotationToolPickerSheetPage,
  }));
}

function loadImageEditorDiscardChangesSheetPage() {
  return import('@/features/images/pages/ImageEditorDiscardChangesSheetPage').then((module) => ({
    default: module.ImageEditorDiscardChangesSheetPage,
  }));
}

function loadImageAnnotationActionsSheetPage() {
  return import('@/features/images/pages/ImageAnnotationActionsSheetPage').then((module) => ({
    default: module.ImageAnnotationActionsSheetPage,
  }));
}

export function preloadImageCameraSurface(): Promise<unknown> {
  if (preloadedImageSurfaces.has(IMAGE_CAMERA_SURFACE_ID)) {
    return prewarmCameraStream();
  }

  preloadedImageSurfaces.add(IMAGE_CAMERA_SURFACE_ID);

  return Promise.allSettled([loadImageCameraPage(), prewarmCameraStream()]);
}

export function preloadImageViewerSurface(): Promise<unknown> {
  if (preloadedImageSurfaces.has(IMAGE_VIEWER_SURFACE_ID)) {
    return Promise.resolve();
  }

  preloadedImageSurfaces.add(IMAGE_VIEWER_SURFACE_ID);
  return loadImageFullscreenViewerPage();
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
  [IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadImageAnnotationToolPickerSheetPage),
  },
  [IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadImageEditorDiscardChangesSheetPage),
  },
  [IMAGE_ANNOTATION_ACTIONS_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadImageAnnotationActionsSheetPage),
  },
};
