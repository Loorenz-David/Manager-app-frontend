import { z } from "zod";

export const QuickPreOrderItemFormSchema = z.object({
  item: z.object({
    article_number: z
      .string()
      .trim()
      .min(1, { message: "Enter the article number." })
      .max(128),
    quantity: z
      .number({ message: "Enter a quantity." })
      .int()
      .min(1, { message: "Quantity must be at least 1." }),
  }),
});

export type QuickPreOrderItemFormValues = z.infer<
  typeof QuickPreOrderItemFormSchema
>;
