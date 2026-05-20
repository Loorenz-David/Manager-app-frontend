import { z } from 'zod';

export const ItemCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  major_category: z.string(),
  created_at: z.string().datetime({ offset: true }),
});
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const IssueSeveritySchema = z.object({
  id: z.string(),
  name: z.string(),
  time_multiplier: z.string(),
  created_at: z.string().datetime({ offset: true }),
});
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const IssueTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  created_at: z.string().datetime({ offset: true }),
});
export type IssueType = z.infer<typeof IssueTypeSchema>;
