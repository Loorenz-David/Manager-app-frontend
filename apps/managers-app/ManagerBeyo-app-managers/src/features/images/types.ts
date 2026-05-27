import { z } from 'zod';

import { ApiEnvelopeSchema } from '@/types/api';

export const IMAGE_STORAGE_PROVIDER = ['s3', 'shopify', 'external'] as const;
export type ImageStorageProvider = (typeof IMAGE_STORAGE_PROVIDER)[number];

export const IMAGE_SOURCE_TYPE = ['uploaded', 'shopify_sync', 'generated'] as const;
export type ImageSourceType = (typeof IMAGE_SOURCE_TYPE)[number];

export const IMAGE_SOURCE_REFERENCE = ['s3_image_url', 'shopify_image_url'] as const;
export type ImageSourceReference = (typeof IMAGE_SOURCE_REFERENCE)[number];

export const IMAGE_EVENT_TYPE = [
  'upload_item_image',
  'upload_case_image',
  'upload_message_image',
] as const;
export type ImageEventType = (typeof IMAGE_EVENT_TYPE)[number];

export const IMAGE_EVENT_STATE = ['requested', 'in_progress', 'completed', 'failed'] as const;
export type ImageEventState = (typeof IMAGE_EVENT_STATE)[number];

export const IMAGE_EVENT_LAST_ERROR = [
  'upload_failed',
  'invalid_content_type',
  'storage_unavailable',
  'file_too_large',
  'virus_detected',
] as const;
export type ImageEventLastError = (typeof IMAGE_EVENT_LAST_ERROR)[number];

export const IMAGE_ANNOTATION_TYPE = [
  'draw',
  'arrow',
  'circle',
  'rectangle',
  'text',
  'measurement',
  'highlight',
] as const;
export type ImageAnnotationType = (typeof IMAGE_ANNOTATION_TYPE)[number];
export type ImageAnnotationTool = Exclude<ImageAnnotationType, 'measurement'>;

export const IMAGE_LINK_ENTITY_TYPE = ['item', 'case', 'case_conversation_message'] as const;
export type ImageLinkEntityType = (typeof IMAGE_LINK_ENTITY_TYPE)[number];

// The backend serializes BigInteger as a JSON number, so runtime validation stays on number.
export const ImageEventSchema = z.object({
  client_id: z.string(),
  event_type: z.enum(IMAGE_EVENT_TYPE),
  state: z.enum(IMAGE_EVENT_STATE),
  created_at: z.string().datetime({ offset: true }),
  last_error: z.enum(IMAGE_EVENT_LAST_ERROR).nullable().optional(),
});
export type ImageEvent = z.infer<typeof ImageEventSchema>;

export const ImageAnnotationSchema = z.object({
  client_id: z.string(),
  annotation_type: z.enum(IMAGE_ANNOTATION_TYPE),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  accuracy: z.number().int().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
});
export type ImageAnnotation = z.infer<typeof ImageAnnotationSchema>;

export const ImageSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  storage_provider: z.enum(IMAGE_STORAGE_PROVIDER),
  source_type: z.enum(IMAGE_SOURCE_TYPE),
  source_reference: z.enum(IMAGE_SOURCE_REFERENCE).nullable().optional(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
  last_event: ImageEventSchema.nullable().optional(),
  events: z.array(ImageEventSchema),
  image_annotation: ImageAnnotationSchema.nullable().optional(),
  image_annotations: z.array(ImageAnnotationSchema).optional(),
});
export type Image = z.infer<typeof ImageSchema>;

export const EntityImageSchema = z.object({
  link_client_id: z.string(),
  image: ImageSchema,
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  display_order: z.number().int(),
});
export type EntityImage = z.infer<typeof EntityImageSchema>;

export const ListEntityImagesParamsSchema = z.object({
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
});
export type ListEntityImagesParams = z.infer<typeof ListEntityImagesParamsSchema>;

export const RequestImageUploadUrlInputSchema = z.object({
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  file_name: z.string(),
  content_type: z.string(),
  file_size_bytes: z.number().int().optional(),
});
export type RequestImageUploadUrlInput = z.infer<typeof RequestImageUploadUrlInputSchema>;

export const ConfirmImageUploadInputSchema = z.object({
  pending_upload_client_id: z.string(),
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
});
export type ConfirmImageUploadInput = z.infer<typeof ConfirmImageUploadInputSchema>;

export const ReorderImagesInputSchema = z.object({
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  ordered_image_client_ids: z.array(z.string()),
});
export type ReorderImagesInput = z.infer<typeof ReorderImagesInputSchema>;

export const UnlinkImageInputSchema = z.object({
  image_client_id: z.string(),
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
});
export type UnlinkImageInput = z.infer<typeof UnlinkImageInputSchema>;

export const CreateImageAnnotationInputSchema = z.object({
  image_client_id: z.string(),
  annotation_type: z.enum(IMAGE_ANNOTATION_TYPE),
  data: z.record(z.string(), z.unknown()),
  accuracy: z.number().int().optional(),
});
export type CreateImageAnnotationInput = z.infer<typeof CreateImageAnnotationInputSchema>;

export const ListEntityImagesResponseSchema = ApiEnvelopeSchema(
  z.object({ images: z.array(EntityImageSchema) }),
).extend({
  ok: z.literal(true),
});
export type ListEntityImagesResponse = z.infer<typeof ListEntityImagesResponseSchema>;

export const GetImageResponseSchema = ApiEnvelopeSchema(
  z.object({ image: ImageSchema }),
).extend({
  ok: z.literal(true),
});
export type GetImageResponse = z.infer<typeof GetImageResponseSchema>;

export const RequestImageUploadUrlResponseSchema = ApiEnvelopeSchema(
  z.object({
    upload_url: z.string(),
    pending_upload_client_id: z.string(),
    storage_key: z.string(),
    expires_in: z.number().int(),
  }),
).extend({
  ok: z.literal(true),
});
export type RequestImageUploadUrlResponse = z.infer<typeof RequestImageUploadUrlResponseSchema>;

export const ConfirmImageUploadResponseSchema = ApiEnvelopeSchema(
  z.object({ image: ImageSchema }),
).extend({
  ok: z.literal(true),
});
export type ConfirmImageUploadResponse = z.infer<typeof ConfirmImageUploadResponseSchema>;

export const ReorderImagesResponseSchema = ApiEnvelopeSchema(
  z.object({ reordered: z.number().int() }),
).extend({
  ok: z.literal(true),
});
export type ReorderImagesResponse = z.infer<typeof ReorderImagesResponseSchema>;

export const UnlinkImageResponseSchema = ApiEnvelopeSchema(
  z.object({ unlinked: z.boolean() }),
).extend({
  ok: z.literal(true),
});
export type UnlinkImageResponse = z.infer<typeof UnlinkImageResponseSchema>;

export const DeleteImageResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({
  ok: z.literal(true),
});
export type DeleteImageResponse = z.infer<typeof DeleteImageResponseSchema>;

export const CreateImageAnnotationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string().optional(),
    created_annotation_client_ids: z.array(z.string()).optional(),
  }),
).extend({
  ok: z.literal(true),
});
export type CreateImageAnnotationResponse = z.infer<typeof CreateImageAnnotationResponseSchema>;

export const DeleteImageAnnotationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    deleted: z.boolean(),
  }),
).extend({
  ok: z.literal(true),
});
export type DeleteImageAnnotationResponse = z.infer<typeof DeleteImageAnnotationResponseSchema>;

export type DeleteImageAnnotationInput = {
  image_client_id: string;
  annotation_client_id: string;
};

export const UpdateImageAnnotationInputSchema = z.object({
  image_client_id: z.string(),
  annotation_client_id: z.string(),
  data: z.record(z.string(), z.unknown()),
  accuracy: z.number().int().optional(),
});
export type UpdateImageAnnotationInput = z.infer<typeof UpdateImageAnnotationInputSchema>;

export const UpdateImageAnnotationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    updated: z.boolean(),
  }),
).extend({
  ok: z.literal(true),
});
export type UpdateImageAnnotationResponse = z.infer<typeof UpdateImageAnnotationResponseSchema>;

export const ImageDownloadUrlResponseSchema = ApiEnvelopeSchema(
  z.object({
    download_url: z.string(),
    expires_in: z.number().int(),
  }),
).extend({
  ok: z.literal(true),
});
export type ImageDownloadUrlResponse = z.infer<typeof ImageDownloadUrlResponseSchema>;

export const IMAGE_UPLOAD_STATE = [
  'idle',
  'captured',
  'compressing',
  'requesting_upload_url',
  'uploading',
  'confirming',
  'completed',
  'failed',
  'delete_requested',
  'deleting',
] as const;
export type ImageUploadState = (typeof IMAGE_UPLOAD_STATE)[number];

export type ImageAnnotationViewModel = {
  clientId: string;
  annotationType: ImageAnnotationType;
  data: Record<string, unknown> | null;
  accuracy: number | null;
  createdAt: string;
};

export type DrawAnnotationData = {
  tool: 'draw';
  points: number[];
  color: string;
  strokeWidth: number;
};

export type ArrowAnnotationData = {
  tool: 'arrow';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  strokeWidth: number;
};

export type CircleAnnotationData = {
  tool: 'circle';
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  color: string;
  strokeWidth: number;
};

export type RectangleAnnotationData = {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
};

export type TextAnnotationData = {
  tool: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
};

export type HighlightAnnotationData = {
  tool: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
};

export type ImageAnnotationItemData =
  | DrawAnnotationData
  | ArrowAnnotationData
  | CircleAnnotationData
  | RectangleAnnotationData
  | TextAnnotationData
  | HighlightAnnotationData;

export type AnnotatedCanvasItem = {
  data: ImageAnnotationItemData;
  annotationClientId: string | null;
  source: 'persisted' | 'session';
};

export type ImageAnnotationSessionData = {
  version: 1;
  items: ImageAnnotationItemData[];
};

export type ImageViewModel = {
  clientId: string;
  linkClientId: string | null;
  entityType: ImageLinkEntityType | null;
  entityClientId: string | null;
  imageUrl: string;
  localObjectUrl: string | null;
  displayOrder: number;
  widthPx: number | null;
  heightPx: number | null;
  fileSizeBytes: number | null;
  createdAt: string | null;
  uploadState: ImageUploadState;
  isOptimistic: boolean;
  isDeleted: boolean;
  pendingUploadClientId: string | null;
  uploadError: string | null;
  annotation: ImageAnnotationViewModel | null;
  annotations: ImageAnnotationViewModel[];
  isFullyLoaded?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => isFiniteNumber(entry));
}

function isImageAnnotationTypeValue(value: unknown): value is ImageAnnotationType {
  return typeof value === 'string' && IMAGE_ANNOTATION_TYPE.includes(value as ImageAnnotationType);
}

export function isImageAnnotationItemData(value: unknown): value is ImageAnnotationItemData {
  if (!isRecord(value) || !isImageAnnotationTypeValue(value.tool)) {
    return false;
  }

  switch (value.tool) {
    case 'draw':
      return (
        isFiniteNumberArray(value.points) &&
        typeof value.color === 'string' &&
        isFiniteNumber(value.strokeWidth)
      );
    case 'arrow':
      return (
        isFiniteNumber(value.fromX) &&
        isFiniteNumber(value.fromY) &&
        isFiniteNumber(value.toX) &&
        isFiniteNumber(value.toY) &&
        typeof value.color === 'string' &&
        isFiniteNumber(value.strokeWidth)
      );
    case 'circle':
      return (
        isFiniteNumber(value.centerX) &&
        isFiniteNumber(value.centerY) &&
        isFiniteNumber(value.radiusX) &&
        isFiniteNumber(value.radiusY) &&
        typeof value.color === 'string' &&
        isFiniteNumber(value.strokeWidth)
      );
    case 'rectangle':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        isFiniteNumber(value.width) &&
        isFiniteNumber(value.height) &&
        typeof value.color === 'string' &&
        isFiniteNumber(value.strokeWidth)
      );
    case 'text':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        typeof value.text === 'string' &&
        isFiniteNumber(value.fontSize) &&
        typeof value.color === 'string'
      );
    case 'measurement':
      return false;
    case 'highlight':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        isFiniteNumber(value.width) &&
        isFiniteNumber(value.height) &&
        typeof value.color === 'string' &&
        isFiniteNumber(value.opacity)
      );
  }
}

function isImageAnnotationSessionData(value: unknown): value is ImageAnnotationSessionData {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.items) &&
    value.items.every((item) => isImageAnnotationItemData(item))
  );
}

export function readImageAnnotationItems(
  data: Record<string, unknown> | null | undefined,
): ImageAnnotationItemData[] {
  if (!data) {
    return [];
  }

  if (isImageAnnotationSessionData(data)) {
    return data.items;
  }

  if (isImageAnnotationItemData(data)) {
    return [data];
  }

  return [];
}

export function readImageAnnotationSingleItem(
  annotation: ImageAnnotationViewModel,
): ImageAnnotationItemData | null {
  if (!annotation.data) {
    return null;
  }

  if (isImageAnnotationItemData(annotation.data)) {
    return annotation.data;
  }

  if (isImageAnnotationSessionData(annotation.data)) {
    return annotation.data.items[0] ?? null;
  }

  return null;
}

export function buildImageAnnotationPayload(items: ImageAnnotationItemData[]): {
  annotationType: ImageAnnotationType;
  data: ImageAnnotationSessionData;
} | null {
  if (items.length === 0) {
    return null;
  }

  const annotationType = items.every((item) => item.tool === items[0]?.tool)
    ? items[0]!.tool
    : 'draw';

  return {
    annotationType,
    data: {
      version: 1,
      items,
    },
  };
}

export function toImageAnnotationViewModel(
  annotation: ImageAnnotation,
): ImageAnnotationViewModel {
  return {
    clientId: annotation.client_id,
    annotationType: annotation.annotation_type,
    data: annotation.data ?? null,
    accuracy: annotation.accuracy ?? null,
    createdAt: annotation.created_at,
  };
}

export function mergeImageAnnotationViewModels(
  annotation: ImageAnnotationViewModel | null | undefined,
  annotations: ImageAnnotationViewModel[],
): ImageAnnotationViewModel[] {
  if (!annotation) {
    return annotations;
  }

  return annotations.some((item) => item.clientId === annotation.clientId)
    ? annotations
    : [annotation, ...annotations];
}

export function toImageAnnotationViewModels(
  annotation: ImageAnnotation | null | undefined,
  annotations: ImageAnnotation[] | null | undefined,
): ImageAnnotationViewModel[] {
  const mappedAnnotation = annotation
    ? toImageAnnotationViewModel(annotation)
    : null;
  const mappedAnnotations = (annotations ?? []).map(toImageAnnotationViewModel);

  return mergeImageAnnotationViewModels(mappedAnnotation, mappedAnnotations);
}

export function toImageViewModel(entityImage: EntityImage): ImageViewModel {
  const annotation = entityImage.image.image_annotation
    ? toImageAnnotationViewModel(entityImage.image.image_annotation)
    : null;

  return {
    clientId: entityImage.image.client_id,
    linkClientId: entityImage.link_client_id,
    entityType: entityImage.entity_type,
    entityClientId: entityImage.entity_client_id,
    imageUrl: entityImage.image.image_url,
    localObjectUrl: null,
    displayOrder: entityImage.display_order,
    widthPx: entityImage.image.width_px ?? null,
    heightPx: entityImage.image.height_px ?? null,
    fileSizeBytes: entityImage.image.file_size_bytes ?? null,
    createdAt: entityImage.image.created_at,
    uploadState: 'completed',
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation,
    annotations: toImageAnnotationViewModels(
      entityImage.image.image_annotation,
      entityImage.image.image_annotations,
    ),
    isFullyLoaded: true,
  };
}
