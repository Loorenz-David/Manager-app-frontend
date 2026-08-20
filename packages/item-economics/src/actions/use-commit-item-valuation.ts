import { useCallback } from "react";

import { ApiRequestError } from "@beyo/api-client";
import { notify, type TaskId } from "@beyo/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  commitTaskEvaluation,
  type CommittedEvaluation,
} from "../api/commit-task-evaluation";
import { itemEconomicsKeys } from "../api/item-economics-keys";
import { parseErrorIdentity } from "../lib/error-identity";
import {
  allowedCentimin,
  budgetMinor,
  formatAllowedWorkerMinutes,
} from "../lib/price-scenario-math";
import type { PriceScenarioModel } from "../types";

/**
 * Save — one call that both prices the item and moves the task's working budget
 * (price-scenario handoff §6), followed by the M8 reconciliation.
 */

export type CommitItemValuationInput = {
  priceMinor: number;
  model: PriceScenarioModel;
};

/** The neutral M8 notice. A mismatch is a rare expected event, not an error. */
export const RECONCILIATION_NOTICE_TITLE = "Numbers re-checked";
export const RECONCILIATION_NOTICE_BODY =
  "The numbers were re-checked against the server — showing the saved result.";

const SETTINGS_COPY: Record<string, string> = {
  ITEM_COST_NO_COST_GROUP:
    "No cost group is configured for this item's category. Set one up in the item economics settings.",
  ITEM_COST_AMBIGUOUS_COST_GROUP:
    "More than one active cost group matches this item's category. Resolve it in the item economics settings.",
  ITEM_COST_NO_BASIS_VERSION:
    "That cost group has no applicable cost basis. Add one in the item economics settings.",
  ITEM_COST_NO_COST_MODEL_VERSION:
    "No applicable cost model was found. Add one in the item economics settings.",
};

const IDENTITY_COPY: Record<string, string> = {
  ...SETTINGS_COPY,
  ITEM_COST_NO_PRIMARY_ITEM: "This task has no primary item to price.",
  ITEM_COST_TASK_TERMINAL:
    "This task is finished — economics can no longer be committed.",
  ITEM_COST_ITEM_MISSING_MAJOR_CATEGORY:
    "This item has no wood or seat category yet, so it cannot be priced.",
  ITEM_COST_ITEM_UNVALUED: "Price the item first — fetch its purchase price.",
  ITEM_COST_EXPECTED_PRICE_REQUIRED:
    "This item's valuation has no expected sale price yet.",
  ITEM_COST_PURCHASE_COST_REQUIRED:
    "The cost model needs a purchase cost and this item has none. Fetch the purchase price first.",
  ITEM_COST_CURRENCY_MISMATCH:
    "The item's, basis's and model's currencies disagree. Resolve it in the item economics settings.",
  ITEM_COST_CONCURRENT_COMMIT:
    "Someone else saved first — showing the latest numbers.",
};

export function resolveCommitErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return "Something went wrong. Please try again.";
  }

  const identity = parseErrorIdentity(error.message);
  const mapped = identity === null ? undefined : IDENTITY_COPY[identity];

  if (mapped !== undefined) {
    return mapped;
  }

  switch (error.code) {
    case "not_found":
      return "This task no longer exists.";
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

/**
 * The M8 comparison, in full: exact integer equality on the budget and exact
 * **string** equality on the allowed worker minutes.
 *
 * Both sides are computed by the same pipeline the screen displayed, so a
 * disagreement means the configuration moved mid-drag or the ≤ 1.5-öre
 * approximation crossed a display boundary. Neither is an error; both mean the
 * screen must show the server's result instead of its own.
 */
function isReconciled(
  evaluation: CommittedEvaluation,
  { priceMinor, model }: CommitItemValuationInput,
): boolean {
  return (
    evaluation.production_budget_minor ===
      Number(budgetMinor(priceMinor, model)) &&
    evaluation.allowed_worker_minutes ===
      formatAllowedWorkerMinutes(allowedCentimin(priceMinor, model))
  );
}

export function useCommitItemValuation(
  taskId: TaskId,
  /** Called on a 200 with the M8 verdict, before the refetch is requested. */
  onCommitted?: (reconciled: boolean) => void,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CommitItemValuationInput) =>
      commitTaskEvaluation(taskId, {
        expected_sale_price_minor: input.priceMinor,
      }),
    onSuccess: async (evaluation, input) => {
      const reconciled = isReconciled(evaluation, input);

      onCommitted?.(reconciled);

      // One refetch, always — a match still needs the new `saved` block with its
      // author and timestamp, and a mismatch must never leave the old numbers
      // on screen. Never a re-commit, never a second reconciliation.
      await queryClient.invalidateQueries({
        queryKey: itemEconomicsKeys.priceScenario(taskId),
      });

      if (!reconciled) {
        notify.info(RECONCILIATION_NOTICE_TITLE, RECONCILIATION_NOTICE_BODY);
      }
    },
    onError: async (error) => {
      notify.error("Could not save", resolveCommitErrorMessage(error));

      if (
        error instanceof ApiRequestError &&
        parseErrorIdentity(error.message) === "ITEM_COST_CONCURRENT_COMMIT"
      ) {
        await queryClient.invalidateQueries({
          queryKey: itemEconomicsKeys.priceScenario(taskId),
        });
      }
    },
  });

  const { mutateAsync } = mutation;

  const commit = useCallback(
    async (input: CommitItemValuationInput): Promise<void> => {
      try {
        await mutateAsync(input);
      } catch {
        // Surfaced by `onError`; swallowed here so a rejected save never
        // becomes an unhandled rejection in the caller's press handler.
      }
    },
    [mutateAsync],
  );

  return {
    commit,
    isPending: mutation.isPending,
  };
}

export type CommitItemValuationAction = ReturnType<
  typeof useCommitItemValuation
>;
