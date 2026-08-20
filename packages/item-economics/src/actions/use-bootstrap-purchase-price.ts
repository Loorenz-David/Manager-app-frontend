import { useCallback, useState } from "react";

import { ApiRequestError } from "@beyo/api-client";
import { fetchItemLookup, type ItemLookupResult } from "@beyo/items";
import type { ItemId, TaskId } from "@beyo/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { itemEconomicsKeys } from "../api/item-economics-keys";
import {
  putItemValuation,
  type PutItemValuationBody,
} from "../api/put-item-valuation";
import { parseErrorIdentity } from "../lib/error-identity";
import {
  INLINE_PRICING_CURRENCY,
  resolveTotalMinor,
} from "../lib/item-pricing";
import type { PriceScenario } from "../types";

/**
 * The purchase-price bootstrap of screen state S4 (intention §3.3, contract
 * §4A M1).
 *
 * The app never sets an expected sold price before a purchase price exists,
 * because the purchase price arrives from the external purchase application by
 * article-number lookup — and because the commit endpoint refuses outright while
 * no valuation row exists (price-scenario handoff §6.2). This PUT is what
 * creates that row.
 */

export type PurchaseBootstrapOutcome =
  | { kind: "saved" }
  | { kind: "no-article-number" }
  | { kind: "not-on-purchase-app" }
  | { kind: "purchase-price-missing" };

/** The standing S4 copy, shown before and between attempts. */
export const PURCHASE_BOOTSTRAP_MESSAGE =
  "No purchase price on this item yet, so there is nothing to price against.";

export const PURCHASE_BOOTSTRAP_NO_ARTICLE_MESSAGE =
  "This item has no article number yet. Set one via Change article number, then fetch the purchase price.";

const NOT_ON_PURCHASE_APP_MESSAGE =
  "The item was not found — it must first be created on the purchase application.";

const PURCHASE_PRICE_MISSING_MESSAGE =
  "Set the purchase price on the purchase application, then fetch again.";

const CONCURRENT_VALUATION_MESSAGE =
  "Someone else was pricing this item at the same time. Try fetching again.";

/**
 * The same selection rule as task creation's `selectPurchaseApiLookupResult`,
 * re-stated here rather than imported: `@beyo/item-economics` must never depend
 * on `@beyo/task-creation` (master plan §9.5), and the rule is one predicate.
 */
function selectPurchaseApiResult(
  items: ItemLookupResult[],
): ItemLookupResult | null {
  return items.find((item) => item.external_source === "purchase_api") ?? null;
}

/**
 * The validity gate of M1, identical to `applyPurchasePriceLookupResult`:
 * finite and non-negative. Anything else is "set it on the purchase
 * application", and **no PUT fires**.
 */
function isUsablePurchasePrice(
  purchasePrice: number | null | undefined,
): purchasePrice is number {
  return (
    purchasePrice != null &&
    Number.isFinite(purchasePrice) &&
    purchasePrice >= 0
  );
}

/**
 * The PUT body of intention §4A M1, built by exactly this rule and no other.
 *
 * - `purchase_cost_minor` goes through `resolveTotalMinor`, which rounds per
 *   piece **before** multiplying and applies `max(1, quantity)` — never a
 *   hand-rolled `Math.round(price * quantity * 100)`.
 * - `expected_sale_price_minor` is echoed **iff** a saved expected price
 *   exists, and is then absent rather than `null`: the two are different
 *   instructions to this endpoint.
 * - the currency is the scenario's when it has one (it is `null` only before the
 *   first pricing), else the inline-pricing constant — which is what this very
 *   write is about to make true.
 */
export function buildPurchaseValuationBody(
  scenario: PriceScenario,
  purchasePricePerPiece: number,
): PutItemValuationBody {
  const purchaseCostMinor = resolveTotalMinor(
    purchasePricePerPiece,
    scenario.item?.quantity ?? null,
  );

  const body: PutItemValuationBody = {
    // `resolveTotalMinor` only returns null for an absent price, which the
    // validity gate has already excluded before this function is reached.
    purchase_cost_minor: purchaseCostMinor ?? 0,
    currency: scenario.currency ?? INLINE_PRICING_CURRENCY,
  };

  const savedExpected = scenario.saved?.expected_sale_price_minor ?? null;

  if (savedExpected !== null) {
    body.expected_sale_price_minor = savedExpected;
  }

  return body;
}

function resolveBootstrapErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return "The purchase price could not be fetched. Try again.";
  }

  if (parseErrorIdentity(error.message) === "ITEM_COST_CONCURRENT_VALUATION") {
    return CONCURRENT_VALUATION_MESSAGE;
  }

  switch (error.code) {
    case "not_found":
      return NOT_ON_PURCHASE_APP_MESSAGE;
    case "forbidden":
      return "You do not have permission to price this item.";
    case "network_error":
      return "Check your connection and try again.";
    case "server_error":
      return "Something went wrong on our end. Please try again.";
    default:
      return error.message;
  }
}

function outcomeMessage(outcome: PurchaseBootstrapOutcome): string | null {
  switch (outcome.kind) {
    case "not-on-purchase-app":
      return NOT_ON_PURCHASE_APP_MESSAGE;
    case "purchase-price-missing":
      return PURCHASE_PRICE_MISSING_MESSAGE;
    case "saved":
    case "no-article-number":
      return null;
  }
}

export function useBootstrapPurchasePrice(taskId: TaskId) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (
      scenario: PriceScenario,
    ): Promise<PurchaseBootstrapOutcome> => {
      const item = scenario.item;

      // The CTA is disabled in this branch, so this is a guard rather than a
      // path — and it keeps the lookup from firing on an empty article number.
      if (item === null || item.article_number === null) {
        return { kind: "no-article-number" };
      }

      const lookup = await fetchItemLookup({
        article_number: item.article_number,
      });
      const purchaseResult = selectPurchaseApiResult(lookup.items);

      if (purchaseResult === null) {
        return { kind: "not-on-purchase-app" };
      }

      if (!isUsablePurchasePrice(purchaseResult.purchase_price)) {
        return { kind: "purchase-price-missing" };
      }

      await putItemValuation(
        item.client_id as ItemId,
        buildPurchaseValuationBody(scenario, purchaseResult.purchase_price),
      );

      return { kind: "saved" };
    },
    onSuccess: async (outcome) => {
      setErrorMessage(outcomeMessage(outcome));

      if (outcome.kind !== "saved") {
        return;
      }

      // The screen re-resolves out of S4 from the refreshed payload — normally
      // into the editor with `can_commit: true` (handoff §6.2).
      await queryClient.invalidateQueries({
        queryKey: itemEconomicsKeys.priceScenario(taskId),
      });
    },
    onError: async (error) => {
      setErrorMessage(resolveBootstrapErrorMessage(error));

      if (
        error instanceof ApiRequestError &&
        parseErrorIdentity(error.message) === "ITEM_COST_CONCURRENT_VALUATION"
      ) {
        // A racing writer already moved the row — the retry has to be offered
        // against what is there now (operational handoff §3.1).
        await queryClient.invalidateQueries({
          queryKey: itemEconomicsKeys.priceScenario(taskId),
        });
      }
    },
  });

  const { mutate } = mutation;

  const bootstrap = useCallback(
    (scenario: PriceScenario): void => {
      setErrorMessage(null);
      mutate(scenario);
    },
    [mutate],
  );

  return {
    bootstrap,
    isPending: mutation.isPending,
    errorMessage,
  };
}

export type BootstrapPurchasePriceAction = ReturnType<
  typeof useBootstrapPurchasePrice
>;
