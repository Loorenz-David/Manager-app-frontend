import { z } from "zod";

import { CustomerFieldsSchema } from "@beyo/customers";
import { DateOnlySchema } from "@beyo/lib";
import { ItemIssuesFieldsSchema } from "@beyo/item-issues";
import { ItemDetailsFieldsSchema } from "@beyo/items";
import type { TaskNoteComposerValue } from "@beyo/task-notes";
import {
  ItemUpholsteryFieldsSchema,
  type UpholsteryPickerOption,
} from "@beyo/upholstery";
import {
  WorkingSectionPickerFieldsSchema,
  WorkingSectionAssignmentSchema,
  type WorkingSectionAssignment,
  type WorkingSectionMember,
  type WorkingSectionOption,
  type WorkingSectionPickerOption,
} from "@beyo/working-sections";
import {
  TASK_FULFILLMENT_METHOD,
  TASK_RETURN_SOURCE,
} from "@beyo/tasks";
import type {
  ItemCategoryPickerOption,
} from "@beyo/item-categories";
import type { ItemLookupResult } from "@beyo/items";

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
  note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
});
export type ReturnFormValues = z.input<typeof ReturnFormSchema>;

export const PreOrderFormSchema = ReturnFormSchema;
export type PreOrderFormValues = ReturnFormValues;

export const WorkerItemIssueSelectionDraftSchema = z
  .record(z.string(), z.number().int().min(0).max(3))
  .default({});
export type WorkerItemIssueSelectionDraft = z.input<
  typeof WorkerItemIssueSelectionDraftSchema
>;

export const InternalFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
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

export const WorkerInternalFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    item_issue_selection_draft: WorkerItemIssueSelectionDraftSchema,
    needs_cleaning_assignment:
      WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment,
    oiling_treatment_assignment: z
      .array(WorkingSectionAssignmentSchema)
      .default([]),
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

    if (data.item.major_category && data.item.major_category !== "wood") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "This lookup returned a non-wood item. This form only supports wood items.",
        path: ["item", "item_category_id"],
      });
    }

    if (!data.item.item_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category.",
        path: ["item", "item_category_id"],
      });
    }
  });
export type WorkerInternalFormValues = z.input<typeof WorkerInternalFormSchema>;

export type {
  ItemCategoryPickerOption,
  ItemLookupResult,
  TaskNoteComposerValue,
  UpholsteryPickerOption,
  WorkingSectionAssignment,
  WorkingSectionMember,
  WorkingSectionOption,
  WorkingSectionPickerOption,
};
