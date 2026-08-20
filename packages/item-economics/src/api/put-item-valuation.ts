import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema, type ItemId } from "@beyo/lib";

import {
  ITEM_ECONOMICS_BASE_PATH,
  ItemEconomicsStatusSchema,
  type ValuationCurrency,
} from "../types";

/**
 * The purchase-price bootstrap's write (operational handoff §3.1). The body is
 * built by intention §4A M1 and by nothing else — see
 * `actions/use-bootstrap-purchase-price.ts`.
 *
 * `expected_sale_price_minor` is **optional by design**: M1 echoes the saved
 * expected price only when one exists, and an absent key is not the same as a
 * `null` one on this endpoint.
 */
export type PutItemValuationBody = {
  purchase_cost_minor: number;
  expected_sale_price_minor?: number;
  currency: ValuationCurrency;
};

/**
 * Deliberately minimal (plan task 1, projection P1): the bootstrap needs proof
 * of success and the resulting status, nothing more. Every other field of the
 * response belongs to screens that do not exist yet, and schema-ing them here
 * would make this call fail on changes it does not read.
 */
const ItemValuationResponseSchema = z.object({
  item_valuation: z.object({ client_id: z.string() }),
  preview: z.object({ status: ItemEconomicsStatusSchema }),
});

export type PutItemValuationResult = z.infer<typeof ItemValuationResponseSchema>;

const ItemValuationEnvelopeSchema = ApiEnvelopeSchema(
  ItemValuationResponseSchema,
);

export async function putItemValuation(
  itemId: ItemId,
  body: PutItemValuationBody,
): Promise<PutItemValuationResult> {
  const response = await apiClient.put(
    `${ITEM_ECONOMICS_BASE_PATH}/items/${itemId}/valuation`,
    ItemValuationEnvelopeSchema,
    body,
  );

  return response.data;
}
