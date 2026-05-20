import { z } from 'zod';

import { ClientIdSchema } from '@/lib/client-id';
import type {
  ItemId,
  ItemUpholsteryId,
  UpholsteryId,
  UpholsteryInventoryId,
  UpholsteryRequirementId,
} from '@/types/common';

export const ITEM_UPHOLSTERY_SOURCE = ['internal', 'customer'] as const;
export const UPHOLSTERY_REQUIREMENT_CURRENCY = [
  'swedish_krona',
  'danish_krona',
  'euro',
] as const;
export const UPHOLSTERY_REQUIREMENT_SOURCE = ['inventory', 'surplus'] as const;
export const UPHOLSTERY_REQUIREMENT_STATE = [
  'missing_quantity',
  'available',
  'needs_ordering',
  'ordered',
  'in_use',
  'completed',
  'failed',
] as const;

export const ItemUpholsterySchema = z.object({
  id: z.string().transform((v) => v as ItemUpholsteryId),
  item_id: z.string().transform((v) => v as ItemId),
  upholstery_id: z.string().transform((v) => v as UpholsteryId).nullable(),
  name: z.string().nullable(),
  code: z.string().nullable(),
  amount_meters: z.string().nullable(),
  source: z.enum(ITEM_UPHOLSTERY_SOURCE),
  time_to_fix_in_seconds: z.number().int().nullable(),
  active_requirement_id: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});
export type ItemUpholstery = z.infer<typeof ItemUpholsterySchema>;

export const UpholsteryRequirementSchema = z.object({
  id: z.string().transform((v) => v as UpholsteryRequirementId),
  item_upholstery_id: z.string().transform((v) => v as ItemUpholsteryId),
  upholstery_inventory_id: z
    .string()
    .transform((v) => v as UpholsteryInventoryId)
    .nullable(),
  amount_meters: z.string().nullable(),
  value_minor: z.number().int().nullable(),
  currency: z.enum(UPHOLSTERY_REQUIREMENT_CURRENCY).nullable(),
  source: z.enum(UPHOLSTERY_REQUIREMENT_SOURCE),
  state: z.enum(UPHOLSTERY_REQUIREMENT_STATE),
  created_at: z.string().datetime({ offset: true }),
  ordered_at: z.string().datetime({ offset: true }).nullable(),
  in_use_at: z.string().datetime({ offset: true }).nullable(),
  completed_at: z.string().datetime({ offset: true }).nullable(),
  failed_at: z.string().datetime({ offset: true }).nullable(),
});
export type UpholsteryRequirement = z.infer<typeof UpholsteryRequirementSchema>;

export const CreateItemUpholsteryInputSchema = z.object({
  client_id: ClientIdSchema,
  item_id: z.string().min(1),
  upholstery_id: z.string().min(1).optional(),
  name: z.string().max(255).optional(),
  code: z.string().max(128).optional(),
  amount_meters: z.string().optional(),
  source: z.enum(ITEM_UPHOLSTERY_SOURCE, { message: 'Select a source.' }),
  time_to_fix_in_seconds: z.number().int().nonnegative().optional(),
});
export type CreateItemUpholsteryInput = z.infer<typeof CreateItemUpholsteryInputSchema>;

export const UpdateItemUpholsteryInputSchema = z.object({
  id: z.string().transform((v) => v as ItemUpholsteryId),
  name: z.string().max(255).nullable().optional(),
  code: z.string().max(128).nullable().optional(),
  amount_meters: z.string().nullable().optional(),
  time_to_fix_in_seconds: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateItemUpholsteryInput = z.infer<typeof UpdateItemUpholsteryInputSchema>;

export const MarkUpholsteryOrderedInputSchema = z.object({
  upholstery_id: z.string().min(1),
  ordered_quantity: z.string().min(1, 'Enter a quantity.'),
  priority_item_upholstery_ids: z.array(z.string().min(1)).optional(),
});
export type MarkUpholsteryOrderedInput = z.infer<typeof MarkUpholsteryOrderedInputSchema>;

export const CompleteRequirementInputSchema = z.object({
  id: z.string().transform((v) => v as UpholsteryRequirementId),
});
export type CompleteRequirementInput = z.infer<typeof CompleteRequirementInputSchema>;

export type ListItemUpholsteriesParams = {
  limit?: number;
  offset?: number;
};

export type ListRequirementsParams = {
  item_upholstery_id: ItemUpholsteryId;
  limit?: number;
  offset?: number;
};

export type ItemUpholsteryViewModel = ItemUpholstery & {
  display_name: string;
  amount_meters_display: string | null;
  state_label: string;
  source_label: string;
};

export function toItemUpholsteryViewModel(
  iu: ItemUpholstery,
): ItemUpholsteryViewModel {
  const amountNum = iu.amount_meters ? Number.parseFloat(iu.amount_meters) : null;

  return {
    ...iu,
    display_name: iu.name ?? iu.code ?? iu.id,
    amount_meters_display:
      amountNum !== null && !Number.isNaN(amountNum) ? `${amountNum.toFixed(2)} m` : null,
    state_label: iu.active_requirement_id ? 'In progress' : 'No active requirement',
    source_label: iu.source === 'internal' ? 'Internal stock' : 'Customer supplied',
  };
}

export type UpholsteryRequirementViewModel = UpholsteryRequirement & {
  state_label: string;
  amount_meters_display: string | null;
};

export function toUpholsteryRequirementViewModel(
  req: UpholsteryRequirement,
): UpholsteryRequirementViewModel {
  const amountNum = req.amount_meters ? Number.parseFloat(req.amount_meters) : null;

  return {
    ...req,
    state_label: req.state,
    amount_meters_display:
      amountNum !== null && !Number.isNaN(amountNum) ? `${amountNum.toFixed(2)} m` : null,
  };
}
