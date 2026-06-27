import type { RichTextContent } from "@beyo/lib";
import { ImageAnnotationSchema } from "@beyo/images";
import { z } from "zod";

export type TaskNoteContentBlock = {
  type: string;
  text?: string;
  [key: string]: unknown;
};

export type TaskNoteComposerValue = {
  content: RichTextContent;
  plainText: string;
};

export type TaskNoteInlinePayload = {
  client_id: string;
  note_type: "user_note";
  content: TaskNoteContentBlock[];
  plain_text: string;
  users_read_list: string[];
};

export const TaskNoteApiUserSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
  role: z
    .object({
      client_id: z.string(),
      name: z.string(),
    })
    .nullable(),
  workspace_role: z
    .object({
      client_id: z.string(),
      name: z.string(),
    })
    .nullable(),
});

export const TaskNoteApiNoteSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  note_type: z.string(),
  content: z.array(
    z
      .object({
        type: z.string(),
        text: z.string().optional(),
      })
      .passthrough(),
  ),
  plain_text: z.string(),
  users_read_list: z.array(z.string()),
  created_at: z.string(),
  created_by: TaskNoteApiUserSchema.nullable(),
  updated_at: z.string().nullable(),
  updated_by: TaskNoteApiUserSchema.nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().nullable(),
});

export const TaskNoteApiImageSchema = z
  .object({
    client_id: z.string(),
    image_url: z.string(),
    width_px: z.number().nullable().optional(),
    height_px: z.number().nullable().optional(),
    image_annotation: ImageAnnotationSchema.nullable().optional(),
    image_annotations: z.array(ImageAnnotationSchema).optional(),
  })
  .passthrough();

export const TaskNoteApiEntrySchema = z.object({
  note: TaskNoteApiNoteSchema,
  note_images: z.array(TaskNoteApiImageSchema),
});

export type TaskNoteApiUser = z.infer<typeof TaskNoteApiUserSchema>;
export type TaskNoteApiNote = z.infer<typeof TaskNoteApiNoteSchema>;
export type TaskNoteApiImage = z.infer<typeof TaskNoteApiImageSchema>;
export type TaskNoteApiEntry = z.infer<typeof TaskNoteApiEntrySchema>;
