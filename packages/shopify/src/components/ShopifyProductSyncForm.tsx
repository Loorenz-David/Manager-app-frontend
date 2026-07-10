import { FormProvider, useForm } from "react-hook-form";
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
import { ShopifyProductSyncDimensionField } from "./fields/ShopifyProductSyncDimensionField";
import { ShopifyProductSyncShopField } from "./fields/ShopifyProductSyncShopField";
import { ShopifyProductSyncSkuField } from "./fields/ShopifyProductSyncSkuField";
import { ShopifyProductSyncTitleField } from "./fields/ShopifyProductSyncTitleField";
import {
  isFormFilled,
  resolveShopifyProductSyncSubmit,
} from "../lib/resolve-shopify-product-sync-submit";
import { useShopifyProductSyncFormContext } from "../providers/ShopifyProductSyncFormProvider";
import {
  ShopifyProductSyncFormSchema,
  type ShopifyProductSyncFormValues,
} from "../types";

export function ShopifyProductSyncForm(): React.JSX.Element {
  const ctx = useShopifyProductSyncFormContext();
  const form = useForm<ShopifyProductSyncFormValues>({
    resolver: zodResolver(ShopifyProductSyncFormSchema),
    mode: "onChange",
    defaultValues: {
      shopIntegrationIds: [],
      sku: ctx.itemSku ?? "",
      heightCm: null,
      widthCm: null,
      depthCm: null,
      title: ctx.defaultTitle ?? "",
      description: "",
    },
  });
  const mutation = useProcessShopifyProducts();
  const values = form.watch();
  async function handleSubmit(
    next: ShopifyProductSyncFormValues,
  ): Promise<void> {
    const result = resolveShopifyProductSyncSubmit({
      values: next,
      itemClientId: ctx.itemClientId,
      itemArticleNumber: ctx.itemArticleNumber,
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
  const staged = useStagedForm({
    steps: [
      { id: "target", title: "Target" },
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
        header={
          <ShopifyProductSyncStagedFormHeader title="Shopify Product Sync" />
        }
        footer={
          <StagedFormNavigation
            submitLabel={isFormFilled(values) ? "Sync" : "Skip"}
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
            <ContentCard gapClassName="gap-3">
              <ShopifyProductSyncDimensionField
                name="heightCm"
                label="Height"
                inputTestId="shopify-product-sync-height-input"
              />
              <ShopifyProductSyncDimensionField
                name="widthCm"
                label="Width"
                inputTestId="shopify-product-sync-width-input"
              />
              <ShopifyProductSyncDimensionField
                name="depthCm"
                label="Depth"
                inputTestId="shopify-product-sync-depth-input"
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
