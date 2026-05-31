import { z } from "zod";

import { CustomerFieldsSchema } from "@/features/customers";
import {
  ItemDetailsFieldsSchema,
  ItemIssuesFieldsSchema,
  ItemUpholsteryFieldsSchema,
} from "@/features/items";
import {
  TaskAdditionalDetailsFieldsSchema,
  TASK_FULFILLMENT_METHOD,
  TASK_RETURN_SOURCE,
} from "@/features/tasks";
import { WorkingSectionPickerFieldsSchema } from "@/features/working-sections";
import { DateOnlySchema } from "@/types/common";

export const TASK_CREATION_FORM_TYPE = [
  "return",
  "pre_order",
  "internal",
] as const;
export type TaskCreationFormType = (typeof TASK_CREATION_FORM_TYPE)[number];

export const ReturnFormSchema = z.object({
  item: ItemDetailsFieldsSchema,
  item_upholstery: ItemUpholsteryFieldsSchema,
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,
  customer: CustomerFieldsSchema,
  return_source: z.enum(TASK_RETURN_SOURCE).optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  working_section_assignments:
    WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
  ready_by_at: DateOnlySchema.nullable().optional(),
  additional_details:
    TaskAdditionalDetailsFieldsSchema.shape.additional_details,
});
export type ReturnFormValues = z.input<typeof ReturnFormSchema>;

export const PreOrderFormSchema = ReturnFormSchema;
export type PreOrderFormValues = ReturnFormValues;

export const InternalFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    additional_details:
      TaskAdditionalDetailsFieldsSchema.shape.additional_details,
  })
  .superRefine((data, ctx) => {
    if (!data.item.article_number?.trim() && !data.item.sku?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an article number or SKU.",
        path: ["item", "article_number"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an article number or SKU.",
        path: ["item", "sku"],
      });
    }
    if (!data.item.major_category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category type.",
        path: ["item", "major_category"],
      });
    } else if (!data.item.item_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category.",
        path: ["item", "item_category_id"],
      });
    }
  });
export type InternalFormValues = z.input<typeof InternalFormSchema>;
