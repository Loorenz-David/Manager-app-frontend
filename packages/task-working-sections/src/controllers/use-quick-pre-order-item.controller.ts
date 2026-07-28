import { useEffect, useEffectEvent, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState } from "react-hook-form";

import {
  type ItemLookupResult,
  type UpdateItemInput,
} from "@beyo/items";
import { type TaskListItemRaw, useUpdateItem } from "@beyo/tasks";

import {
  createQuickLookupSignature,
  selectQuickLookupResult,
} from "../lib/select-quick-lookup-result";
import {
  QuickPreOrderItemFormSchema,
  type QuickPreOrderItemFormValues,
} from "../types";

type UseQuickPreOrderItemControllerArgs = {
  task: TaskListItemRaw | null;
};

const EMPTY_ITEM_VALUES: QuickPreOrderItemFormValues = {
  item: {
    article_number: "",
    quantity: 1,
  },
};

export function useQuickPreOrderItemController({
  task,
}: UseQuickPreOrderItemControllerArgs) {
  const item = task?.primary_item ?? null;
  const taskId = task?.task.client_id ?? "";
  const updateItem = useUpdateItem(taskId);
  const form = useForm<QuickPreOrderItemFormValues>({
    resolver: zodResolver(QuickPreOrderItemFormSchema),
    defaultValues: EMPTY_ITEM_VALUES,
    mode: "onChange",
  });
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);
  // `reset` below re-baselines the defaults from the stored item, so isDirty
  // means "the manager changed the article number or the quantity".
  const { isDirty: hasItemChanges } = useFormState({ control: form.control });

  useEffect(() => {
    form.reset({
      item: {
        article_number: item?.article_number ?? "",
        quantity: item?.quantity ?? 1,
      },
    });
    lastAppliedLookupSignatureRef.current = null;
  }, [form, item?.client_id]);

  const hasItem = Boolean(item);

  const handleLookupResult = useEffectEvent(
    (items: ItemLookupResult[]): boolean | "invalid" => {
      // Entering the step with an article number already on the item fires the
      // field's debounced lookup on its own. Writing back then would replace a
      // stored quantity the manager never touched, so only a hand-edited
      // article number may pull values in.
      const currentArticleNumber = form.getValues("item.article_number").trim();
      if (currentArticleNumber === (item?.article_number ?? "")) {
        return false;
      }

      const match = selectQuickLookupResult(items);

      if (!match) {
        return "invalid";
      }

      const signature = createQuickLookupSignature(match);
      if (signature === lastAppliedLookupSignatureRef.current) {
        return false;
      }

      form.setValue("item.quantity", match.quantity, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue("item.article_number", match.article_number, {
        shouldDirty: true,
      });
      lastAppliedLookupSignatureRef.current = signature;
      return true;
    },
  );

  async function validate(): Promise<boolean> {
    if (!hasItem) {
      return false;
    }

    return form.trigger();
  }

  async function submitItemPatch(): Promise<boolean> {
    if (!item) {
      return false;
    }

    const values = form.getValues();
    const articleNumber = values.item.article_number.trim();
    const changes: Pick<UpdateItemInput, "article_number" | "quantity"> = {};

    if (articleNumber !== (item.article_number ?? "")) {
      changes.article_number = articleNumber;
    }
    if (values.item.quantity !== item.quantity) {
      changes.quantity = values.item.quantity;
    }

    if (Object.keys(changes).length === 0) {
      return true;
    }

    try {
      await updateItem.mutateAsync({
        id: item.client_id,
        ...changes,
      });
      return true;
    } catch {
      form.setError("item.article_number", {
        type: "server",
        message: "Could not save the item. Try again.",
      });
      return false;
    }
  }

  function reset(): void {
    form.reset(EMPTY_ITEM_VALUES);
    lastAppliedLookupSignatureRef.current = null;
  }

  return {
    form,
    hasItem,
    hasItemChanges,
    itemClientId: item?.client_id ?? null,
    isPatching: updateItem.isPending,
    handleLookupResult,
    validate,
    submitItemPatch,
    reset,
  };
}

export type QuickPreOrderItemController = ReturnType<
  typeof useQuickPreOrderItemController
>;
