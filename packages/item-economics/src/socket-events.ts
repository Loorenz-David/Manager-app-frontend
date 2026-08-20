import type { TaskId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import type { QueryClient } from "@tanstack/react-query";

import { itemEconomicsKeys } from "./api/item-economics-keys";

/**
 * The scenario branch root — every task's price scenario at once.
 *
 * Built here rather than added to the key factory on purpose: the factory
 * registers `priceScenario(taskId)` and nothing else (master plan §6), and this
 * prefix exists only so the two workspace-wide handlers below can reach every
 * open screen without knowing which task it shows.
 */
const PRICE_SCENARIO_BRANCH = [
  ...itemEconomicsKeys.all,
  "price-scenario",
] as const;

/**
 * The debounce of intention §4A M9: 12 s, trailing edge, restarted on every
 * event, no max-wait. The typical is a workspace-wide median over the
 * completed-step history, so a busy floor emits step transitions continuously
 * and this aggregate is expensive on the backend — one refetch after the events
 * stop is worth as much as fifty during them (price-scenario handoff §6.3).
 *
 * Commit correctness does not rest on this timer at all; it rests on M10's
 * fresh-fetch gate at the moment Save is pressed.
 */
const SCENARIO_DEBOUNCE_MS = 12_000;

/**
 * Module scope by contract: the handler map is static, so there is no mount to
 * hang a timer off and no cleanup to run. At most one refetch per quiet window,
 * regardless of event volume.
 */
let scenarioDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Handlers receive their `queryClient` per event, but the trailing fire happens
 * after the last event has returned — so the latest client is captured here
 * (projection r0-phase2 P4).
 */
let latestQueryClient: QueryClient | null = null;

function invalidateScenarioBranch(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: PRICE_SCENARIO_BRANCH,
    refetchType: "active",
  });
}

export const itemEconomicsSocketEvents: SocketEventHandlers = {
  "task:step-state-changed": (_payload, { queryClient }) => {
    // The payload IDs belong to steps, not tasks. There is no safe targeted
    // lookup, so invalidate the task branch and let active observers refetch.
    queryClient.invalidateQueries({
      queryKey: itemEconomicsKeys.tasks(),
      refetchType: "active",
    });

    // The scenario deliberately does not hang off `tasks()`, so the immediate
    // invalidation above cannot reach it. It arrives on the trailing edge.
    latestQueryClient = queryClient;

    if (scenarioDebounceTimer !== null) {
      clearTimeout(scenarioDebounceTimer);
    }

    scenarioDebounceTimer = setTimeout(() => {
      scenarioDebounceTimer = null;
      const client = latestQueryClient;
      latestQueryClient = null;

      if (client !== null) {
        invalidateScenarioBranch(client);
      }
    }, SCENARIO_DEBOUNCE_MS);
  },

  // Item edits (quantity, category) are rare and material — the quantity is the
  // per-piece divisor of every number on the screen, so this one is immediate.
  "item:updated": (_payload, { queryClient }) => {
    invalidateScenarioBranch(queryClient);
  },

  "item_economics:evaluation-committed": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: itemEconomicsKeys.taskProductionTime(client_id as TaskId),
      refetchType: "active",
    });

    // Another manager saved this task's price: the open screen's saved block,
    // anchors and band are all stale.
    queryClient.invalidateQueries({
      queryKey: itemEconomicsKeys.priceScenario(client_id as TaskId),
      refetchType: "active",
    });
  },
};
