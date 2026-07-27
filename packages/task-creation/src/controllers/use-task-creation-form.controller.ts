import { useEffect, useRef, useState } from "react";

import { selectUser, useAuthStore } from "@beyo/auth";
import { generateClientId } from "@beyo/lib";

import { useReserveSkuTemplate } from "../actions/use-reserve-sku-template";
import type { TaskCreationCallbacks } from "../surfaces";
import type { SkuReservation, TaskCreationFormType } from "../types";

type UseTaskCreationFormControllerOptions = {
  callbacks?: TaskCreationCallbacks;
  taskType?: TaskCreationFormType;
};

type SkuInitializationState =
  | { status: "not_required" }
  | { status: "pending" }
  | { status: "success"; reservation: SkuReservation }
  | { status: "error"; error: Error };

export function useTaskCreationFormController({
  callbacks,
  taskType,
}: UseTaskCreationFormControllerOptions) {
  const user = useAuthStore(selectUser);
  const currentUserClientId = String(user?.id ?? "");
  const reservationRequestedRef = useRef(false);

  const [taskClientId, setTaskClientId] = useState(() =>
    generateClientId("ExecutionTask"),
  );
  const [itemClientId, setItemClientId] = useState(() =>
    generateClientId("Item"),
  );
  const [customerClientId, setCustomerClientId] = useState(() =>
    generateClientId("Customer"),
  );
  const [noteClientId, setNoteClientId] = useState(() =>
    generateClientId("TaskNote"),
  );
  const [skuInitialization, setSkuInitialization] =
    useState<SkuInitializationState>(() =>
      taskType === "pre_order"
        ? { status: "pending" }
        : { status: "not_required" },
    );

  const skuReservation = useReserveSkuTemplate();
  const reserveSkuTemplateAsync = skuReservation.reserveSkuTemplateAsync;

  useEffect(() => {
    if (taskType !== "pre_order" || reservationRequestedRef.current) {
      return;
    }

    // React StrictMode repeats mount effects in development. Keep the
    // irreversible reservation command to one request per actual surface mount.
    reservationRequestedRef.current = true;
    void reserveSkuTemplateAsync("pre_order")
      .then((reservation) => {
        setSkuInitialization({ status: "success", reservation });
      })
      .catch((error: unknown) => {
        setSkuInitialization({
          status: "error",
          error: error instanceof Error ? error : new Error("Unknown error"),
        });
      });
  }, [reserveSkuTemplateAsync, taskType]);

  function regenerateIds(): void {
    setTaskClientId(generateClientId("ExecutionTask"));
    setItemClientId(generateClientId("Item"));
    setCustomerClientId(generateClientId("Customer"));
    setNoteClientId(generateClientId("TaskNote"));
  }

  return {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    regenerateIds,
    callbacks: callbacks ?? {},
    initialItemSku:
      skuInitialization.status === "success"
        ? skuInitialization.reservation.sku
        : "",
    isSkuInitializationPending: skuInitialization.status === "pending",
    skuInitializationError:
      skuInitialization.status === "error" ? skuInitialization.error : null,
  };
}

export type TaskCreationFormController = ReturnType<
  typeof useTaskCreationFormController
>;
