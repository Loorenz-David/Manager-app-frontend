import { z } from "zod";

export const COMPOSITION_SCHEMA_VERSION = 1 as const;
export const CompositionSchemaVersionSchema = z.literal(COMPOSITION_SCHEMA_VERSION);

export const MediaTypeSchema = z.enum(["image", "video"]);
export const PlaybackModeSchema = z.enum(["manual", "timed", "media_driven"]);
export const ElementTypeSchema = z.enum(["media", "text"]);
export const AnimationTypeSchema = z.enum([
  "none",
  "fade",
  "fade_up",
  "fade_down",
  "slide_left",
  "slide_right",
  "scale_in",
  "scale_out",
]);
export const AnimationEasingSchema = z.enum([
  "linear",
  "ease",
  "ease_in",
  "ease_out",
  "ease_in_out",
]);
export const LayoutFitSchema = z.enum(["cover", "contain", "fill", "none"]);
export const LayoutAnchorSchema = z.enum([
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
]);
export const TextAlignSchema = z.enum(["left", "center", "right", "justify"]);
export const TextRoleSchema = z.enum([
  "headline",
  "subheadline",
  "body",
  "caption",
  "overline",
]);
export const TextOverflowSchema = z.enum(["clip", "ellipsis", "visible"]);

export type CompositionSchemaVersion = z.infer<typeof CompositionSchemaVersionSchema>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
export type PlaybackMode = z.infer<typeof PlaybackModeSchema>;
export type ElementType = z.infer<typeof ElementTypeSchema>;
export type AnimationType = z.infer<typeof AnimationTypeSchema>;
export type AnimationEasing = z.infer<typeof AnimationEasingSchema>;
export type LayoutFit = z.infer<typeof LayoutFitSchema>;
export type LayoutAnchor = z.infer<typeof LayoutAnchorSchema>;
export type TextAlign = z.infer<typeof TextAlignSchema>;
export type TextRole = z.infer<typeof TextRoleSchema>;
export type TextOverflow = z.infer<typeof TextOverflowSchema>;

export const ElementLayoutSchema = z.strictObject({
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  width: z.number().positive().max(1).optional(),
  height: z.number().positive().max(1).optional(),
  fit: LayoutFitSchema.optional(),
  anchor: LayoutAnchorSchema.optional(),
  align: TextAlignSchema.optional(),
  rotation_deg: z.number().min(-360).max(360).optional(),
  scale: z.number().positive().max(10).optional(),
});
export type ElementLayout = z.infer<typeof ElementLayoutSchema>;

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/);

export const TextStyleSchema = z.strictObject({
  text_role: TextRoleSchema.optional(),
  text_align: TextAlignSchema.optional(),
  font_size: z.number().min(8).max(200).optional(),
  font_weight: z.number().int().min(100).max(900).multipleOf(100).optional(),
  text_color: HexColorSchema.optional(),
  background_color: HexColorSchema.optional(),
  border_radius: z.number().min(0).max(400).optional(),
  padding: z.number().min(0).max(400).optional(),
  max_lines: z.number().int().min(1).max(50).optional(),
  overflow: TextOverflowSchema.optional(),
});
export type TextStyle = z.infer<typeof TextStyleSchema>;

export const ElementAnimationSchema = z.strictObject({
  type: AnimationTypeSchema,
  duration_ms: z.number().int().min(0).max(60_000).optional(),
  delay_ms: z.number().int().min(0).max(60_000).optional(),
  easing: AnimationEasingSchema.optional(),
  distance: z.number().min(0).max(1).optional(),
  opacity: z.number().min(0).max(1).optional(),
  scale: z.number().min(0).max(10).optional(),
});
export type ElementAnimation = z.infer<typeof ElementAnimationSchema>;

export const SlideMediaSchema = z.object({
  client_id: z.string().startsWith("aupm_").max(64),
  // 0 is legal in drafts — the backend only normalizes sequences to 1..N at publish.
  sequence_order: z.number().int().nonnegative(),
  media_type: MediaTypeSchema,
  media_url: z.url(),
  poster_url: z.url().nullable(),
  fallback_url: z.url().nullable(),
  alt_text: z.string().nullable(),
  mime_type: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration_ms: z.number().int().nonnegative().nullable(),
  is_looping: z.boolean(),
});
export type SlideMedia = z.infer<typeof SlideMediaSchema>;

export const CompositionElementSchema = z
  .object({
    client_id: z.string().startsWith("aupe_").max(64).nullable(),
    element_type: ElementTypeSchema,
    sequence_order: z.number().int().nonnegative(),
    layer_index: z.number().int(),
    start_ms: z.number().int().nonnegative(),
    end_ms: z.number().int().positive().nullable(),
    media: SlideMediaSchema.nullable(),
    text_content: z.string().nullable(),
    layout: ElementLayoutSchema.nullable(),
    style: TextStyleSchema.nullable(),
    enter_animation: ElementAnimationSchema.nullable(),
    exit_animation: ElementAnimationSchema.nullable(),
  })
  .refine((element) => element.end_ms === null || element.end_ms > element.start_ms, {
    message: "end_ms must be greater than start_ms",
    path: ["end_ms"],
  });
export type CompositionElement = z.infer<typeof CompositionElementSchema>;
