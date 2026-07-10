import { zodResolver } from "@hookform/resolvers/zod";
import {
  ContentCard,
  FieldErrorPill,
  FieldLabelRow,
  TextInput,
  useScrollHide,
} from "@beyo/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ShopifyCreateBottomActions } from "../components/ShopifyCreateBottomActions";

const CREATE_FORM_ID = "shopify-create-form";

const CreateShopifyIntegrationSchema = z.object({
  shop_domain: z
    .string()
    .trim()
    .min(1, "Shop domain is required."),
});

type CreateShopifyIntegrationValues = z.infer<
  typeof CreateShopifyIntegrationSchema
>;

type ShopifyIntegrationCreateContainerProps = {
  isSubmitting: boolean;
  canCreate: boolean;
  onBack: () => void;
  onSubmit: (shopDomain: string) => Promise<void>;
};

export function ShopifyIntegrationCreateContainer({
  isSubmitting,
  canCreate,
  onBack,
  onSubmit,
}: ShopifyIntegrationCreateContainerProps): React.JSX.Element {
  const { scrollRef, hideProgressContainerRef } = useScrollHide();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateShopifyIntegrationValues>({
    resolver: zodResolver(CreateShopifyIntegrationSchema),
    defaultValues: {
      shop_domain: "",
    },
  });

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="shopify-create-pane"
    >
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-none"
      >
        <div className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Connect Shopify shop
            </h2>
            <p className="text-sm text-muted-foreground">
              Start the Shopify install flow.
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            id={CREATE_FORM_ID}
            onSubmit={handleSubmit(async (values) => {
              await onSubmit(values.shop_domain.trim());
            })}
          >
            <ContentCard>
              <div className="flex flex-col gap-1.5">
                <FieldLabelRow
                  htmlFor="shopify-shop-domain"
                  label="Shop domain"
                >
                  <FieldErrorPill
                    data-testid="shopify-shop-domain-error"
                    message={errors.shop_domain?.message}
                  />
                </FieldLabelRow>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  data-testid="shopify-shop-domain-input"
                  id="shopify-shop-domain"
                  inputMode="url"
                  invalid={Boolean(errors.shop_domain?.message)}
                  placeholder="my-shop.myshopify.com"
                  {...register("shop_domain")}
                />
              </div>
            </ContentCard>

            {!canCreate ? (
              <ContentCard>
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  You do not have permission to start a Shopify install.
                </p>
              </ContentCard>
            ) : null}
          </form>
        </div>
      </div>

      <ShopifyCreateBottomActions
        canCreate={canCreate}
        formId={CREATE_FORM_ID}
        isSubmitting={isSubmitting}
        onBack={onBack}
      />
    </div>
  );
}
