import type { TaskId } from "@beyo/lib";
import { describe, expect, it } from "vitest";

import { itemEconomicsKeys } from "./item-economics-keys";

const TASK_ID = "tsk_ref0001" as TaskId;

describe("itemEconomicsKeys.priceScenario (M9 key placement)", () => {
  it("hangs directly off the root branch", () => {
    expect(itemEconomicsKeys.priceScenario(TASK_ID)).toEqual([
      ...itemEconomicsKeys.all,
      "price-scenario",
      TASK_ID,
    ]);
  });

  it("is not reachable from the undebounced tasks() branch", () => {
    // `task:step-state-changed` invalidates tasks() immediately; the scenario is
    // an expensive workspace-wide aggregate and must only be reached by the
    // debounced handler, so it must not carry that prefix.
    const tasksBranch = itemEconomicsKeys.tasks();
    const scenarioKey = itemEconomicsKeys.priceScenario(TASK_ID);

    expect(
      tasksBranch.every((segment, index) => scenarioKey[index] === segment),
    ).toBe(false);
  });

  it("still shares the domain root with every other item-economics key", () => {
    expect(itemEconomicsKeys.priceScenario(TASK_ID)[0]).toBe(
      itemEconomicsKeys.all[0],
    );
  });
});
