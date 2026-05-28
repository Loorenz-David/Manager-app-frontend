import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

export const UPHOLSTERY_INVENTORY_CONDITION = [
  "available",
  "low_stock",
  "out_of_stock",
] as const;

export const UpholsteryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
  list_order: z.number().nullable(),
  current_stored_amount_meters: z.string().nullable(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
});

export type UpholsteryPickerOption = z.infer<
  typeof UpholsteryPickerOptionSchema
>;

const ResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryPickerOptionSchema,
  }),
);

export async function fetchUpholstery(
  clientId: string,
): Promise<UpholsteryPickerOption> {
  const response = await apiClient.get(
    `/api/v1/upholsteries/${clientId}`,
    ResponseSchema,
  );
  return response.data.upholstery;
}
