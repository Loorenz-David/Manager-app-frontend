import { z } from "zod";

export const UpholsteryCategoryInlineSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
});
export type UpholsteryCategoryInline = z.infer<
  typeof UpholsteryCategoryInlineSchema
>;

export const UpholsteryCategorySchema = z.object({
  client_id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
  created_at: z.string(),
  created_by_id: z.string().nullable(),
  updated_at: z.string().nullable(),
  updated_by_id: z.string().nullable(),
  is_deleted: z.boolean(),
  upholstery_count: z.number().int(),
});
export type UpholsteryCategory = z.infer<typeof UpholsteryCategorySchema>;

export type ListUpholsteryCategoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  favorite?: boolean;
};

export const CreateUpholsteryCategoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
});
export type CreateUpholsteryCategoryFormValues = z.infer<
  typeof CreateUpholsteryCategoryFormSchema
>;

export type CreateUpholsteryCategoryPayload = {
  name: string;
  image_url: string | null;
  favorite: boolean;
};
