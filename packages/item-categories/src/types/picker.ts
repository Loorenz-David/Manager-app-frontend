import { z } from "zod";

export const ItemCategoryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  major_category: z.string(),
  image_url: z.string().nullable(),
});
export type ItemCategoryPickerOption = z.infer<
  typeof ItemCategoryPickerOptionSchema
>;

export type ListItemCategoriesPickerParams = {
  q?: string;
  limit?: number;
  offset?: number;
};
