import { useEffect, useRef } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStagedForm } from "@beyo/hooks";
import {
  StagedForm,
  StagedFormNavigation,
  StagedFormStep,
  ContentCard,
} from "@beyo/ui";
import { useProcessShopifyProducts } from "../actions/use-process-shopify-products";
import { ShopifyProductSyncStagedFormHeader } from "./ShopifyProductSyncStagedFormHeader";
import { ShopifyProductSyncDescriptionField } from "./fields/ShopifyProductSyncDescriptionField";
import { ShopifyProductSyncShopField } from "./fields/ShopifyProductSyncShopField";
import { ShopifyProductSyncSkuField } from "./fields/ShopifyProductSyncSkuField";
import { ShopifyProductSyncTitleField } from "./fields/ShopifyProductSyncTitleField";
import {
  isFormFilled,
  resolveShopifyProductSyncSubmit,
} from "../lib/resolve-shopify-product-sync-submit";
import { notify } from "@beyo/lib";
import { useShopifyProductSyncFormContext } from "../providers/ShopifyProductSyncFormProvider";
import {
  ShopifyProductSyncFormSchema,
  type ShopifyProductSyncFormValues,
} from "../types";
import { ShopifyMetafieldPickerForm } from "./metafields/ShopifyMetafieldPickerForm";
import { useShopifyProductSyncDraft } from "../hooks/use-shopify-product-sync-draft";

export function ShopifyProductSyncForm(): React.JSX.Element {
  const ctx = useShopifyProductSyncFormContext();
  const form = useForm<ShopifyProductSyncFormValues>({
    resolver: zodResolver(ShopifyProductSyncFormSchema),
    mode: "onChange",
    defaultValues: {
      shopIntegrationIds: [],
      sku: ctx.itemSku ?? "",
      metafields: [],
      title: ctx.defaultTitle ?? "",
      description: "",
    },
  });
  const mutation = useProcessShopifyProducts();
  const draft = useShopifyProductSyncDraft(ctx.taskClientId);
  const hasRestoredRef = useRef(false);
  const metafieldsField = useController({
    control: form.control,
    name: "metafields",
  }).field;
  const values = form.watch();
  async function handleSubmit(
    next: ShopifyProductSyncFormValues,
  ): Promise<void> {
    const result = resolveShopifyProductSyncSubmit({
      values: next,
      itemClientId: ctx.itemClientId,
      itemArticleNumber: ctx.itemArticleNumber,
      productCategory: ctx.productCategory,
    });
    if (result.kind === "skip") {
      ctx.onSkipped?.();
      return;
    }
    if (result.kind === "blocked") {
      staged.navigateTo(result.field === "title" ? "content" : "target");
      form.setError(result.field, { type: "manual", message: result.reason });
      return;
    }
    try {
      await mutation.mutateAsync(result.payload);
      await draft.discard();
      ctx.onCompleted?.();
    } catch (error) {
      form.setError("root", {
        type: "server",
        message:
          error instanceof Error
            ? error.message
            : "Could not queue Shopify sync.",
      });
    }
  }
  async function handleKeep(): Promise<void> {
    try {
      await draft.save(form.getValues());
      notify.success("Kept", "Shopify product form kept for later.");
      ctx.onKept?.();
    } catch {
      form.setError("root", {
        type: "server",
        message: "Could not keep this form. Please try again.",
      });
    }
  }
  useEffect(() => {
    if (hasRestoredRef.current || draft.isRestoring || !draft.restoredValues) {
      return;
    }
    if (form.formState.isDirty) {
      hasRestoredRef.current = true;
      return;
    }
    hasRestoredRef.current = true;
    form.reset({ ...form.getValues(), ...draft.restoredValues });
    notify.info("Restored", "Saved Shopify product form restored.");
  }, [draft.isRestoring, draft.restoredValues, form]);
  const staged = useStagedForm({
    steps: [
      { id: "target", title: "Target" },
      { id: "metafields", title: "Metafields" },
      { id: "content", title: "Content" },
    ],
    mode: "free",
    onSubmit: () =>
      ctx.mode === "keep" ? handleKeep() : form.handleSubmit(handleSubmit)(),
  });
  return (
    <FormProvider {...form}>
      <StagedForm
        steps={staged.steps}
        activeStepId={staged.activeStepId}
        direction={staged.direction}
        onAdvance={staged.advance}
        onBack={staged.back}
        onNavigate={staged.navigateTo}
        isFirstStep={staged.isFirstStep}
        isLastStep={staged.isLastStep}
        isAdvancing={ctx.mode === "keep" ? draft.isSaving : mutation.isPending}
        navigationMode="free"
        header={
          <ShopifyProductSyncStagedFormHeader title="Shopify Product Sync" />
        }
        footer={
          <StagedFormNavigation
            submitLabel={
              ctx.mode === "keep"
                ? "Keep"
                : isFormFilled(values)
                  ? "Sync"
                  : "Skip"
            }
            onClose={() => ctx.onSkipped?.()}
          />
        }
        data-testid="shopify-product-sync-slide"
      >
        <StagedFormStep id="target" className="px-0">
          <div className="flex flex-col gap-4">
            <ContentCard gapClassName="gap-4 py-5">
              <ShopifyProductSyncShopField />
              <ShopifyProductSyncSkuField />
            </ContentCard>
          </div>
        </StagedFormStep>
        <StagedFormStep id="metafields" className="px-0">
          <div className="flex flex-col gap-4">
            <ContentCard gapClassName="gap-3 ">
              <ShopifyMetafieldPickerForm
                shopIntegrationIds={values.shopIntegrationIds}
                itemCategoryId={ctx.itemCategoryId}
                value={metafieldsField.value}
                onChange={metafieldsField.onChange}
              />
            </ContentCard>
          </div>
        </StagedFormStep>
        <StagedFormStep id="content" className="px-0 ">
          <div className="flex flex-col gap-4">
            <ContentCard>
              <ShopifyProductSyncTitleField />
              <ShopifyProductSyncDescriptionField />
              {form.formState.errors.root?.message ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </ContentCard>
          </div>
        </StagedFormStep>
      </StagedForm>
    </FormProvider>
  );
}
