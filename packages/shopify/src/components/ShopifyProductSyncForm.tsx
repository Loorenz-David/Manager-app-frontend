import { useMemo } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useStagedForm } from "@beyo/hooks";
import {
  StagedForm,
  StagedFormNavigation,
  StagedFormStep,
  ContentCard,
} from "@beyo/ui";
import { notify } from "@beyo/lib";
import { useProcessShopifyProducts } from "../actions/use-process-shopify-products";
import { shopifyKeys } from "../api/shopify-keys";
import { useShopifyItemProductQuery } from "../api/use-shopify-item-product-query";
import { ShopifyProductSyncStagedFormHeader } from "./ShopifyProductSyncStagedFormHeader";
import { ShopifyProductSyncStatusPanel } from "./ShopifyProductSyncStatusPanel";
import { ShopifyProductSyncDescriptionField } from "./fields/ShopifyProductSyncDescriptionField";
import { ShopifyProductSyncShopField } from "./fields/ShopifyProductSyncShopField";
import { ShopifyProductSyncInventoryField } from "./fields/ShopifyProductSyncInventoryField";
import { ShopifyProductSyncSkuField } from "./fields/ShopifyProductSyncSkuField";
import { ShopifyProductSyncTitleField } from "./fields/ShopifyProductSyncTitleField";
import {
  isShopifyItemProductSyncInFlight,
  mapShopifyItemProductToFormValues,
} from "../lib/map-shopify-item-product-to-form-values";
import {
  isFormFilled,
  resolveShopifyProductSyncSubmit,
} from "../lib/resolve-shopify-product-sync-submit";
import { resolveShopifyProductSyncSubmitLabel } from "../lib/resolve-shopify-product-sync-submit-label";
import { useShopifyProductSyncFormContext } from "../providers/ShopifyProductSyncFormProvider";
import {
  ShopifyProductSyncFormSchema,
  type ShopifyItemProductResponse,
  type ShopifyProductSyncFormValues,
} from "../types";
import { ShopifyMetafieldPickerForm } from "./metafields/ShopifyMetafieldPickerForm";

const FORM_TITLE = "Shopify Product Sync";

/**
 * The form is no longer kept in the browser: saving writes to Shopify, and
 * opening the form reads the item's product back from Shopify. The body only
 * mounts once that read has settled, so the Shopify values are the form's
 * baseline and an untouched form is not dirty.
 */
export function ShopifyProductSyncForm(): React.JSX.Element {
  const ctx = useShopifyProductSyncFormContext();
  const query = useShopifyItemProductQuery(ctx.itemClientId);
  const closeLabel = ctx.mode === "keep" ? "Close" : "Skip";
  const close = () => ctx.onSkipped?.();

  if (!ctx.itemClientId) {
    return <ShopifyProductSyncFormBody snapshot={null} />;
  }
  // Wait for a read made now, not a cached one: the product may have changed
  // since this form was last opened.
  if (query.isPending || !query.isFetchedAfterMount) {
    return (
      <ShopifyProductSyncStatusPanel
        title={FORM_TITLE}
        message="Loading the product from Shopify…"
        closeLabel={closeLabel}
        onClose={close}
      />
    );
  }
  if (query.isError) {
    return (
      <ShopifyProductSyncStatusPanel
        title={FORM_TITLE}
        tone="error"
        message="Could not load this item's Shopify product."
        closeLabel={closeLabel}
        onClose={close}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (isShopifyItemProductSyncInFlight(query.data)) {
    return (
      <ShopifyProductSyncStatusPanel
        title={FORM_TITLE}
        message="Saving to Shopify… The form opens as soon as Shopify has the product."
        closeLabel={closeLabel}
        onClose={close}
      />
    );
  }
  const fetchErrors = query.data.shops.filter((shop) => shop.fetch_error);
  if (fetchErrors.length) {
    // Without the current product the form would overwrite it blindly.
    return (
      <ShopifyProductSyncStatusPanel
        title={FORM_TITLE}
        tone="error"
        message={fetchErrors
          .map((shop) => `${shop.shop_domain}: ${shop.fetch_error}`)
          .join("\n")}
        closeLabel={closeLabel}
        onClose={close}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <ShopifyProductSyncFormBody
      key={query.dataUpdatedAt}
      snapshot={query.data}
    />
  );
}

function ShopifyProductSyncFormBody({
  snapshot,
}: {
  snapshot: ShopifyItemProductResponse | null;
}): React.JSX.Element {
  const ctx = useShopifyProductSyncFormContext();
  const queryClient = useQueryClient();
  const existing = useMemo(
    () => (snapshot ? mapShopifyItemProductToFormValues(snapshot) : null),
    [snapshot],
  );
  const hasExistingProduct = existing !== null;
  const failedSyncMessages = (snapshot?.shops ?? [])
    .filter((shop) => shop.sync?.status === "failed")
    .map(
      (shop) =>
        `Last save to ${shop.shop_domain} failed: ${shop.sync?.error_message ?? "unknown error"}`,
    );
  const form = useForm<ShopifyProductSyncFormValues>({
    resolver: zodResolver(ShopifyProductSyncFormSchema),
    mode: "onChange",
    defaultValues: existing ?? {
      shopIntegrationIds: [],
      sku: ctx.itemSku ?? "",
      metafields: [],
      inventoryQuantities: [],
      title: ctx.defaultTitle ?? "",
      description: "",
    },
  });
  const mutation = useProcessShopifyProducts();
  const metafieldsField = useController({
    control: form.control,
    name: "metafields",
  }).field;
  const values = form.watch();
  const isDirty = form.formState.isDirty;

  async function handleSubmit(
    next: ShopifyProductSyncFormValues,
  ): Promise<void> {
    // Unchanged existing product: nothing to send, the step just continues.
    if (hasExistingProduct && !isDirty) {
      ctx.onSkipped?.();
      return;
    }
    const result = resolveShopifyProductSyncSubmit({
      values: next,
      itemClientId: ctx.itemClientId,
      itemArticleNumber: ctx.itemArticleNumber,
      productCategory: ctx.productCategory,
      existingMetafields: existing?.metafields ?? [],
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
      void queryClient.invalidateQueries({
        queryKey: shopifyKeys.itemProduct(ctx.itemClientId),
      });
      if (ctx.mode === "keep") {
        notify.success("Saved", "Product sent to Shopify.");
        ctx.onKept?.();
      } else {
        ctx.onCompleted?.();
      }
    } catch (error) {
      form.setError("root", {
        type: "server",
        message:
          error instanceof Error
            ? error.message
            : "Could not save the product to Shopify.",
      });
    }
  }
  const staged = useStagedForm({
    steps: [
      { id: "target", title: "Target" },
      { id: "metafields", title: "Metafields" },
      { id: "report", title: "Report" },
      { id: "content", title: "Content" },
    ],
    mode: "free",
    onSubmit: () => form.handleSubmit(handleSubmit)(),
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
        isAdvancing={mutation.isPending}
        navigationMode="free"
        header={<ShopifyProductSyncStagedFormHeader title={FORM_TITLE} />}
        footer={
          <StagedFormNavigation
            submitLabel={resolveShopifyProductSyncSubmitLabel({
              mode: ctx.mode,
              hasExistingProduct,
              isDirty,
              isFilled: isFormFilled(values),
            })}
            onClose={() => ctx.onSkipped?.()}
          />
        }
        data-testid="shopify-product-sync-slide"
      >
        <StagedFormStep id="target" className="px-0">
          <div className="flex flex-col gap-4">
            {failedSyncMessages.length ? (
              <p
                className="px-4 text-sm text-destructive"
                data-testid="shopify-product-sync-last-failure"
              >
                {failedSyncMessages.join("\n")}
              </p>
            ) : null}
            <ContentCard gapClassName="gap-4 py-5">
              <ShopifyProductSyncShopField />
              <ShopifyProductSyncSkuField />
              {values.shopIntegrationIds.map((shopIntegrationId) => (
                <ShopifyProductSyncInventoryField
                  key={shopIntegrationId}
                  shopIntegrationId={shopIntegrationId}
                  shopIntegrationIds={values.shopIntegrationIds}
                  // An existing product's stock comes from Shopify; never
                  // auto-add remembered locations on top of it.
                  applyRememberedLocations={!hasExistingProduct}
                />
              ))}
            </ContentCard>
          </div>
        </StagedFormStep>
        <StagedFormStep id="metafields" className="px-0">
          <div className="flex flex-col gap-4">
            <ContentCard gapClassName="gap-3 ">
              <ShopifyMetafieldPickerForm
                step="metafields"
                shopIntegrationIds={values.shopIntegrationIds}
                itemCategoryId={ctx.itemCategoryId}
                value={metafieldsField.value}
                onChange={metafieldsField.onChange}
              />
            </ContentCard>
          </div>
        </StagedFormStep>
        <StagedFormStep id="report" className="px-0">
          <div className="flex flex-col gap-4">
            <ContentCard gapClassName="gap-3">
              <ShopifyMetafieldPickerForm
                step="report"
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
