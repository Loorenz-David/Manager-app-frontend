import { z } from "zod";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  CompositionElementSchema,
  CompositionSchemaVersionSchema,
  ElementAnimationSchema,
  ElementLayoutSchema,
  ElementTypeSchema,
  MediaTypeSchema,
  PlaybackModeSchema,
  SlideMediaSchema,
  TextStyleSchema,
} from "@beyo/presentation-runtime";
import type { MediaType } from "@beyo/presentation-runtime";

export {
  AnimationEasingSchema,
  AnimationTypeSchema,
  COMPOSITION_SCHEMA_VERSION,
  CompositionElementSchema,
  CompositionSchemaVersionSchema,
  ElementAnimationSchema,
  ElementLayoutSchema,
  ElementTypeSchema,
  LayoutAnchorSchema,
  LayoutFitSchema,
  MediaTypeSchema,
  PlaybackModeSchema,
  SlideMediaSchema,
  TextAlignSchema,
  TextOverflowSchema,
  TextRoleSchema,
  TextStyleSchema,
} from "@beyo/presentation-runtime";
export type {
  AnimationEasing,
  AnimationType,
  CompositionElement,
  CompositionSchemaVersion,
  ElementAnimation,
  ElementLayout,
  ElementType,
  LayoutAnchor,
  LayoutFit,
  MediaType,
  PlaybackMode,
  SlideMedia,
  TextAlign,
  TextOverflow,
  TextRole,
  TextStyle,
} from "@beyo/presentation-runtime";

// Enums are the literal wire values documented by the presentation backend.
export const PresentationStatusSchema = z.enum(["draft", "published", "archived"]);
export const PresentationTypeSchema = z.enum(["modal", "full_screen", "slide_page"]);
export const PresentationCategorySchema = z.enum(["alert", "workflow", "improvement", "news"]);
export const AudienceModeSchema = z.enum(["all_matching", "selected_users_only"]);
export const SlideLayoutTypeSchema = z.enum(["media_top", "media_full", "text_overlay"]);
export const AppKeySchema = z.enum(["manager", "worker", "seller", "admin"]);
export const RoleKeySchema = z.enum(["admin", "worker", "manager", "seller"]);
export const ViewStateStatusSchema = z.enum(["unseen", "shown", "dismissed", "completed"]);
export const ViewStateActionSchema = z.enum(["shown", "progressed", "dismissed", "completed"]);

export type PresentationStatus = z.infer<typeof PresentationStatusSchema>;
export type PresentationType = z.infer<typeof PresentationTypeSchema>;
export type PresentationCategory = z.infer<typeof PresentationCategorySchema>;
export type AudienceMode = z.infer<typeof AudienceModeSchema>;
export type SlideLayoutType = z.infer<typeof SlideLayoutTypeSchema>;
export type AppKey = z.infer<typeof AppKeySchema>;
export type RoleKey = z.infer<typeof RoleKeySchema>;
export type ViewStateStatus = z.infer<typeof ViewStateStatusSchema>;
export type ViewStateAction = z.infer<typeof ViewStateActionSchema>;

const TimestampSchema = z.iso.datetime({ offset: true });
const NullableTimestampSchema = TimestampSchema.nullable();

const InAppRouteSchema = z.string().regex(/^\/(?!\/)/);

export const SlideActionSchema = z.object({
  label: z.string().nullable(),
  route: InAppRouteSchema.nullable(),
});
export type SlideAction = z.infer<typeof SlideActionSchema>;

export const SlideSchema = z.object({
  client_id: z.string().startsWith("aups_").max(64),
  // 0 is legal in drafts — the backend only normalizes sequences to 1..N at publish.
  sequence_order: z.number().int().nonnegative(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  layout_type: SlideLayoutTypeSchema,
  playback_mode: PlaybackModeSchema,
  duration_ms: z.number().int().positive().nullable(),
  composition_schema_version: CompositionSchemaVersionSchema,
  media: z.array(SlideMediaSchema),
  action: SlideActionSchema.nullable(),
  elements: z.array(CompositionElementSchema),
});
export type Slide = z.infer<typeof SlideSchema>;

export const AudienceSchema = z.object({
  audience_mode: AudienceModeSchema,
  app_keys: z.array(AppKeySchema),
  role_keys: z.array(RoleKeySchema),
  workspace_ids: z.array(z.string().max(64)),
  user_ids: z.array(z.string().max(64)),
});
export type Audience = z.infer<typeof AudienceSchema>;

const PresentationMetadataShape = {
  client_id: z.string().startsWith("aup_").max(64),
  logical_client_id: z.string().startsWith("aup_").max(64),
  version: z.number().int().positive(),
  workspace_id: z.string().max(64),
  title: z.string(),
  summary: z.string().nullable(),
  status: PresentationStatusSchema,
  presentation_type: PresentationTypeSchema,
  category: PresentationCategorySchema.nullable(),
  audience_mode: AudienceModeSchema,
  display_priority: z.number().int(),
  is_dismissible: z.boolean(),
  starts_at: NullableTimestampSchema,
  expires_at: NullableTimestampSchema,
  published_at: NullableTimestampSchema,
  archived_at: NullableTimestampSchema,
  created_at: TimestampSchema,
  created_by_id: z.string().max(64),
  updated_at: NullableTimestampSchema,
} as const;

export const PresentationListItemSchema = z.object({
  ...PresentationMetadataShape,
  slide_count: z.number().int().nonnegative(),
  media_kinds: z.array(MediaTypeSchema),
  cover_url: z.url().nullable(),
});
export type PresentationListItem = z.infer<typeof PresentationListItemSchema>;

export const PresentationSchema = z.object({
  ...PresentationMetadataShape,
  slides: z.array(SlideSchema),
  audience: AudienceSchema,
});
export type Presentation = z.infer<typeof PresentationSchema>;

export const ViewStateSchema = z.object({
  status: ViewStateStatusSchema,
  last_slide_index: z.number().int().nonnegative(),
});
export type ViewState = z.infer<typeof ViewStateSchema>;

export const PresentationPreviewSchema = z.object({
  client_id: PresentationMetadataShape.client_id,
  logical_client_id: PresentationMetadataShape.logical_client_id,
  version: PresentationMetadataShape.version,
  title: PresentationMetadataShape.title,
  summary: PresentationMetadataShape.summary,
  presentation_type: PresentationMetadataShape.presentation_type,
  category: PresentationMetadataShape.category,
  is_dismissible: PresentationMetadataShape.is_dismissible,
  display_priority: PresentationMetadataShape.display_priority,
  published_at: PresentationMetadataShape.published_at,
  starts_at: PresentationMetadataShape.starts_at,
  expires_at: PresentationMetadataShape.expires_at,
  slides: z.array(SlideSchema),
  view_state: ViewStateSchema,
});
export type PresentationPreview = z.infer<typeof PresentationPreviewSchema>;

export const PresentationPaginationSchema = z.object({
  items: z.array(PresentationListItemSchema),
  has_more: z.boolean(),
  limit: z.number().int().positive().max(200),
  offset: z.number().int().nonnegative(),
});
export type PresentationPagination = z.infer<typeof PresentationPaginationSchema>;

export const PresentationListResponseSchema = z.object({
  app_update_presentations_pagination: PresentationPaginationSchema,
});
export type PresentationListResponse = z.infer<typeof PresentationListResponseSchema>;

export const UploadUrlResponseSchema = z.object({
  upload_url: z.url(),
  pending_upload_client_id: z.string().startsWith("pu_").max(64),
  storage_key: z.string().min(1),
  expires_in: z.number().int().positive(),
});
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;

const PresentationPayloadSchema = z.object({ presentation: PresentationSchema });
const PresentationPreviewPayloadSchema = z.object({ presentation: PresentationPreviewSchema });
export const PresentationEnvelopeSchema = ApiEnvelopeSchema(PresentationPayloadSchema);
export const PresentationListEnvelopeSchema = ApiEnvelopeSchema(PresentationListResponseSchema);
export const PresentationPreviewEnvelopeSchema = ApiEnvelopeSchema(PresentationPreviewPayloadSchema);
export const UploadUrlEnvelopeSchema = ApiEnvelopeSchema(UploadUrlResponseSchema);

export const CreatePresentationInputSchema = z.strictObject({
  title: z.string().trim().min(1),
  summary: z.string().nullable().optional(),
  presentation_type: PresentationTypeSchema.optional(),
  category: PresentationCategorySchema.nullable().optional(),
  audience_mode: AudienceModeSchema.optional(),
  display_priority: z.number().int().optional(),
  is_dismissible: z.boolean().optional(),
  starts_at: NullableTimestampSchema.optional(),
  expires_at: NullableTimestampSchema.optional(),
  client_id: z.string().startsWith("aup_").max(64).nullable().optional(),
});
export type CreatePresentationInput = z.infer<typeof CreatePresentationInputSchema>;

export const UpdatePresentationMetadataInputSchema = CreatePresentationInputSchema.omit({ client_id: true })
  .partial()
  .extend({ id: z.string().startsWith("aup_").max(64) });
export type UpdatePresentationMetadataInput = z.infer<typeof UpdatePresentationMetadataInputSchema>;

export const PresentationListFiltersSchema = z.strictObject({
  limit: z.number().int().positive().max(200).optional(),
  offset: z.number().int().nonnegative().optional(),
  q: z.string().optional(),
  status: PresentationStatusSchema.optional(),
  logical_client_id: z.string().startsWith("aup_").max(64).optional(),
  version: z.number().int().positive().optional(),
  app_key: AppKeySchema.optional(),
  role_key: RoleKeySchema.optional(),
  published_before: TimestampSchema.optional(),
  published_after: TimestampSchema.optional(),
});
export type PresentationListFilters = z.infer<typeof PresentationListFiltersSchema>;

const SlideMutationFields = {
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  layout_type: SlideLayoutTypeSchema.optional(),
  action_label: z.string().nullable().optional(),
  action_route: InAppRouteSchema.nullable().optional(),
  playback_mode: PlaybackModeSchema.optional(),
  duration_ms: z.number().int().positive().nullable().optional(),
  composition_schema_version: CompositionSchemaVersionSchema.optional(),
} as const;

export const CreateSlideInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  ...SlideMutationFields,
});
export type CreateSlideInput = z.infer<typeof CreateSlideInputSchema>;

export const UpdateSlideInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  slideId: z.string().startsWith("aups_").max(64),
  ...SlideMutationFields,
});
export type UpdateSlideInput = z.infer<typeof UpdateSlideInputSchema>;

export const DeleteSlideInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  slideId: z.string().startsWith("aups_").max(64),
});
export type DeleteSlideInput = z.infer<typeof DeleteSlideInputSchema>;

export const ReorderSlidesInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  ordered_slide_ids: z.array(z.string().startsWith("aups_").max(64)),
});
export type ReorderSlidesInput = z.infer<typeof ReorderSlidesInputSchema>;

export const CreateMediaUploadUrlInputSchema = z
  .strictObject({
    presentationId: z.string().startsWith("aup_").max(64),
    slideId: z.string().startsWith("aups_").max(64),
    media_type: MediaTypeSchema,
    content_type: z.string().min(1),
    file_name: z.string().optional(),
    file_size_bytes: z.number().int().nonnegative().optional(),
  })
  .superRefine((input, context) => {
    const allowed =
      input.media_type === "image"
        ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
        : ["video/mp4", "video/webm", "video/quicktime"];
    const maxSize = input.media_type === "image" ? 20 * 1024 * 1024 : 200 * 1024 * 1024;
    if (!allowed.includes(input.content_type)) {
      context.addIssue({ code: "custom", path: ["content_type"], message: "Unsupported content type" });
    }
    if (input.file_size_bytes !== undefined && input.file_size_bytes > maxSize) {
      context.addIssue({ code: "custom", path: ["file_size_bytes"], message: "File is too large" });
    }
  });
export type CreateMediaUploadUrlInput = z.infer<typeof CreateMediaUploadUrlInputSchema>;

export const ConfirmSlideMediaInputSchema = z
  .strictObject({
    presentationId: z.string().startsWith("aup_").max(64),
    slideId: z.string().startsWith("aups_").max(64),
    media_type: MediaTypeSchema,
    pending_upload_client_id: z.string().startsWith("pu_").max(64).optional(),
    storage_key: z.string().min(1).optional(),
    poster_storage_key: z.string().nullable().optional(),
    fallback_storage_key: z.string().nullable().optional(),
    alt_text: z.string().nullable().optional(),
    mime_type: z.string().nullable().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    duration_ms: z.number().int().nonnegative().nullable().optional(),
    is_looping: z.boolean().optional(),
  })
  .refine((input) => input.pending_upload_client_id !== undefined || input.storage_key !== undefined, {
    message: "pending_upload_client_id or storage_key is required",
  });
export type ConfirmSlideMediaInput = z.infer<typeof ConfirmSlideMediaInputSchema>;

export const UpdateSlideMediaInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  slideId: z.string().startsWith("aups_").max(64),
  mediaId: z.string().startsWith("aupm_").max(64),
  poster_storage_key: z.string().nullable().optional(),
  fallback_storage_key: z.string().nullable().optional(),
  alt_text: z.string().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
  is_looping: z.boolean().optional(),
});
export type UpdateSlideMediaInput = z.infer<typeof UpdateSlideMediaInputSchema>;

export const DeleteSlideMediaInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  slideId: z.string().startsWith("aups_").max(64),
  mediaId: z.string().startsWith("aupm_").max(64),
});
export type DeleteSlideMediaInput = z.infer<typeof DeleteSlideMediaInputSchema>;

export const ReorderSlideMediaInputSchema = z.strictObject({
  presentationId: z.string().startsWith("aup_").max(64),
  slideId: z.string().startsWith("aups_").max(64),
  ordered_media_ids: z.array(z.string().startsWith("aupm_").max(64)),
});
export type ReorderSlideMediaInput = z.infer<typeof ReorderSlideMediaInputSchema>;

export const CompositionElementInputSchema = z
  .strictObject({
    element_type: ElementTypeSchema,
    media_id: z.string().startsWith("aupm_").max(64).optional(),
    text_content: z.string().optional(),
    layer_index: z.number().int().optional(),
    start_ms: z.number().int().nonnegative().optional(),
    end_ms: z.number().int().positive().nullable().optional(),
    layout: ElementLayoutSchema.optional(),
    style: TextStyleSchema.optional(),
    enter_animation: ElementAnimationSchema.optional(),
    exit_animation: ElementAnimationSchema.optional(),
  })
  .superRefine((element, context) => {
    const startMs = element.start_ms ?? 0;
    if (element.end_ms !== undefined && element.end_ms !== null && element.end_ms <= startMs) {
      context.addIssue({ code: "custom", path: ["end_ms"], message: "end_ms must exceed start_ms" });
    }
    if (element.element_type === "media" && element.media_id === undefined) {
      context.addIssue({ code: "custom", path: ["media_id"], message: "media_id is required" });
    }
    if (element.element_type === "text" && !element.text_content) {
      context.addIssue({ code: "custom", path: ["text_content"], message: "text_content is required" });
    }
    if (element.element_type === "media" && element.style !== undefined) {
      context.addIssue({ code: "custom", path: ["style"], message: "style is only valid for text" });
    }
    if (element.element_type === "media" && element.text_content !== undefined) {
      context.addIssue({ code: "custom", path: ["text_content"], message: "media cannot include text_content" });
    }
    if (element.element_type === "text" && element.media_id !== undefined) {
      context.addIssue({ code: "custom", path: ["media_id"], message: "text cannot include media_id" });
    }
  });
export type CompositionElementInput = z.infer<typeof CompositionElementInputSchema>;

export const ReplaceCompositionInputSchema = z
  .strictObject({
    presentationId: z.string().startsWith("aup_").max(64),
    slideId: z.string().startsWith("aups_").max(64),
    playback_mode: PlaybackModeSchema,
    duration_ms: z.number().int().positive().nullable().optional(),
    composition_schema_version: CompositionSchemaVersionSchema.optional(),
    elements: z.array(CompositionElementInputSchema),
  })
  .superRefine((input, context) => {
    if (input.playback_mode === "timed" && (input.duration_ms === undefined || input.duration_ms === null)) {
      context.addIssue({ code: "custom", path: ["duration_ms"], message: "duration_ms is required" });
    }
    if (input.playback_mode === "media_driven" && !input.elements.some((element) => element.element_type === "media")) {
      context.addIssue({ code: "custom", path: ["elements"], message: "A media element is required" });
    }
    if (input.duration_ms !== undefined && input.duration_ms !== null) {
      input.elements.forEach((element, index) => {
        const startMs = element.start_ms ?? 0;
        if (startMs > input.duration_ms!) {
          context.addIssue({ code: "custom", path: ["elements", index, "start_ms"], message: "Timing exceeds duration_ms" });
        }
        if (element.end_ms !== undefined && element.end_ms !== null && element.end_ms > input.duration_ms!) {
          context.addIssue({ code: "custom", path: ["elements", index, "end_ms"], message: "Timing exceeds duration_ms" });
        }
      });
    }
  });
export type ReplaceCompositionInput = z.infer<typeof ReplaceCompositionInputSchema>;

export const ReplaceAudienceInputSchema = z
  .strictObject({
    presentationId: z.string().startsWith("aup_").max(64),
    audience_mode: AudienceModeSchema,
    app_keys: z.array(AppKeySchema).optional(),
    role_keys: z.array(RoleKeySchema).optional(),
    workspace_ids: z.array(z.string().max(64)).optional(),
    user_ids: z.array(z.string().max(64)).optional(),
  })
  .refine(
    (input) => input.audience_mode !== "selected_users_only" || (input.user_ids?.length ?? 0) > 0,
    { path: ["user_ids"], message: "At least one user is required" },
  );
export type ReplaceAudienceInput = z.infer<typeof ReplaceAudienceInputSchema>;

export type PresentationIdInput = { id: string };

export type UploadSlideMediaInput = {
  presentationId: string;
  slideId: string;
  file: File;
  media_type: MediaType;
  alt_text?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  is_looping?: boolean;
};

export type UploadToS3Input = {
  uploadUrl: string;
  file: File;
  contentType: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};
