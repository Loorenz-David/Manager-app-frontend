import { z } from 'zod';

export const StaticCostSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  cost_minor: z.number().int(),
  currency: z.string(),
  created_at: z.string().datetime({ offset: true }),
});
export type StaticCost = z.infer<typeof StaticCostSchema>;
