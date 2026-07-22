import {
  CompositionElementSchema,
  CompositionSchemaVersionSchema,
  PlaybackModeSchema,
  SlideMediaSchema,
} from "@beyo/presentation-runtime";
import { z } from "zod";

export const PresentationTypeSchema = z.enum(["modal", "full_screen", "slide_page"]);
export const PresentationViewStatusSchema = z.enum([
  "unseen",
  "shown",
  "dismissed",
  "completed",
]);
export const PresentationViewActionSchema = z.enum([
  "shown",
  "progressed",
  "dismissed",
  "completed",
]);

export const ConsumerSlideActionSchema = z
  .object({
    label: z.string(),
    route: z.string().startsWith("/"),
  })
  .passthrough();

export const ConsumerPresentationSlideSchema = z
  .object({
    client_id: z.string().startsWith("aups_").max(64),
    // Draft preview payloads may use zero before publish normalization.
    sequence_order: z.number().int().nonnegative(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    layout_type: z.string(),
    playback_mode: PlaybackModeSchema,
    duration_ms: z.number().int().nonnegative().nullable(),
    composition_schema_version: CompositionSchemaVersionSchema,
    media: z.array(SlideMediaSchema),
    action: ConsumerSlideActionSchema.nullable(),
    elements: z.array(CompositionElementSchema),
  })
  .passthrough();

export const ConsumerPresentationViewStateSchema = z
  .object({
    status: PresentationViewStatusSchema,
    last_slide_index: z.number().int().nonnegative(),
  })
  .passthrough();

export const ConsumerPresentationSchema = z
  .object({
    client_id: z.string().startsWith("aup_").max(64),
    logical_client_id: z.string().startsWith("aup_").max(64),
    version: z.number().int().positive(),
    title: z.string(),
    summary: z.string().nullable(),
    presentation_type: PresentationTypeSchema,
    category: z.string(),
    is_dismissible: z.boolean(),
    display_priority: z.number().int(),
    published_at: z.string().nullable(),
    starts_at: z.string().nullable(),
    expires_at: z.string().nullable(),
    slides: z.array(ConsumerPresentationSlideSchema),
    view_state: ConsumerPresentationViewStateSchema,
  })
  .passthrough();

export const RecordedPresentationViewStateSchema = ConsumerPresentationViewStateSchema.extend({
  client_id: z.string().startsWith("aupv_").max(64).optional(),
  presentation_id: z.string().startsWith("aup_").max(64).optional(),
  view_count: z.number().int().nonnegative().optional(),
  first_shown_at: z.string().nullable().optional(),
  last_shown_at: z.string().nullable().optional(),
  dismissed_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
}).passthrough();

export const ActivePresentationEnvelopeSchema = z.object({
  data: z.object({ presentation: ConsumerPresentationSchema.nullable() }),
  ok: z.literal(true),
  warnings: z.array(z.unknown()),
});

export const ViewStateEnvelopeSchema = z.object({
  data: z.object({ view_state: RecordedPresentationViewStateSchema }),
  ok: z.literal(true),
  warnings: z.array(z.unknown()),
});

export type PresentationType = z.infer<typeof PresentationTypeSchema>;
export type PresentationViewAction = z.infer<typeof PresentationViewActionSchema>;
export type ConsumerPresentationSlide = z.infer<typeof ConsumerPresentationSlideSchema>;
export type ConsumerPresentation = z.infer<typeof ConsumerPresentationSchema>;
export type RecordedPresentationViewState = z.infer<typeof RecordedPresentationViewStateSchema>;

export type RecordViewStateInput = {
  presentationClientId: string;
  version: number;
  action: PresentationViewAction;
  lastSlideIndex?: number;
  isDismissible: boolean;
};

