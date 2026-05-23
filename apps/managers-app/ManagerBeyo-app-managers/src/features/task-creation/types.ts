import { z } from 'zod';

import { CustomerFieldsSchema } from '@/features/customers';
import {
  ItemDetailsFieldsSchema,
  ItemIssuesFieldsSchema,
  ItemUpholsteryFieldsSchema,
} from '@/features/items';
import {
  TaskAdditionalDetailsFieldsSchema,
  TASK_FULFILLMENT_METHOD,
  TASK_RETURN_SOURCE,
} from '@/features/tasks';
import { WorkingSectionPickerFieldsSchema } from '@/features/working-sections';
import { DateOnlySchema } from '@/types/common';

export const TASK_CREATION_FORM_TYPE = ['return', 'pre_order', 'internal'] as const;
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
  ready_by_at: DateOnlySchema.nullable().optional(),
  additional_details: TaskAdditionalDetailsFieldsSchema.shape.additional_details,
});
export type ReturnFormValues = z.input<typeof ReturnFormSchema>;

export const PreOrderFormSchema = ReturnFormSchema;
export type PreOrderFormValues = ReturnFormValues;

export const InternalFormSchema = z.object({
  item: ItemDetailsFieldsSchema,
  item_upholstery: ItemUpholsteryFieldsSchema,
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,
  needs_cleaning_assignment: WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment,
  oiling_treatment_assignment: WorkingSectionPickerFieldsSchema.shape.oiling_treatment_assignment,
  working_section_assignments: WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
  ready_by_at: DateOnlySchema.nullable().optional(),
  additional_details: TaskAdditionalDetailsFieldsSchema.shape.additional_details,
});
export type InternalFormValues = z.input<typeof InternalFormSchema>;
