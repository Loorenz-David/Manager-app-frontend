import { z } from "zod";

export const ItemCategoryIdSchema = z.string().brand<"ItemCategoryId">();
export type ItemCategoryId = z.infer<typeof ItemCategoryIdSchema>;

export const MajorCategorySchema = z.string();
export type MajorCategory = z.infer<typeof MajorCategorySchema>;

export const ItemCategorySchema = z.object({
  client_id: ItemCategoryIdSchema,
  name: z.string(),
  major_category: MajorCategorySchema,
  created_at: z.string(),
  created_by_id: z.string(),
  image_url: z.string().nullable(),
});
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ItemCategoriesPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number(),
  offset: z.number(),
});

export const ListItemCategoriesResponseSchema = z.object({
  item_categories: z.array(ItemCategorySchema),
  item_categories_pagination: ItemCategoriesPaginationSchema,
});
export type ListItemCategoriesResponse = z.infer<
  typeof ListItemCategoriesResponseSchema
>;

export type ListItemCategoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

export type ItemCategoryViewModel = {
  id: ItemCategoryId;
  name: string;
  majorCategory: string;
  imageUrl: string | null;
};

export function toItemCategoryViewModel(
  category: ItemCategory,
): ItemCategoryViewModel {
  return {
    id: category.client_id,
    name: category.name,
    majorCategory: category.major_category,
    imageUrl: category.image_url,
  };
}
