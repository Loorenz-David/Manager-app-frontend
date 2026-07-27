import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";

import type {
  FieldPath,
  FieldPathValue,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";

import { useShopifyCustomerLookupQuery } from "../api/use-shopify-customer-lookup-query";
import { mapShopifyCustomerLookupResultToFormFields } from "../lib/map-shopify-customer-to-form-fields";
import { selectBestShopifyCustomerLookupResult } from "../lib/select-shopify-customer-lookup-result";
import type { ShopifyCustomerLookupParams } from "../types";

const SHOPIFY_CUSTOMER_ARTICLE_NUMBER_MIN_LENGTH = 7;
const SHOPIFY_CUSTOMER_SKU_MIN_LENGTH = 6;

type ShopifyCustomerStatus = "idle" | "loading" | "found" | "not_found";

type CustomerPrefillPath =
  | "customer.display_name"
  | "customer.customer_type"
  | "customer.primary_email"
  | "customer.primary_phone_number"
  | "customer.address.street"
  | "customer.address.city"
  | "customer.address.postal_code"
  | "customer.address.coordinates.latitude"
  | "customer.address.coordinates.longitude";

type UseShopifyCustomerLookupPrefillOptions<TFormValues extends FieldValues> = {
  form: UseFormReturn<TFormValues>;
  articleNumber: string | undefined;
  sku: string | undefined;
  enabled: boolean;
};

type PrefillFieldValue = string | number;

type LastInjectedValues = Partial<Record<CustomerPrefillPath, PrefillFieldValue>>;

function normalizeLookupInput(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function normalizeCurrentFormValue(
  value: unknown,
): PrefillFieldValue | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function buildEligibleLookupParams(
  articleNumber: string | undefined,
  sku: string | undefined,
): ShopifyCustomerLookupParams {
  const normalizedArticleNumber = normalizeLookupInput(articleNumber);
  const normalizedSku = normalizeLookupInput(sku);

  return {
    article_number:
      normalizedArticleNumber &&
      normalizedArticleNumber.length >= SHOPIFY_CUSTOMER_ARTICLE_NUMBER_MIN_LENGTH
        ? normalizedArticleNumber
        : undefined,
    sku:
      normalizedSku && normalizedSku.length >= SHOPIFY_CUSTOMER_SKU_MIN_LENGTH
        ? normalizedSku
        : undefined,
  };
}

export function useShopifyCustomerLookupPrefill<
  TFormValues extends FieldValues,
>({
  form,
  articleNumber,
  sku,
  enabled,
}: UseShopifyCustomerLookupPrefillOptions<TFormValues>): {
  status: ShopifyCustomerStatus;
  retry: () => void;
} {
  const lastInjectedValuesRef = useRef<LastInjectedValues>({});
  const retryInFlightRef = useRef(false);
  const eligibleLookupParams = useMemo(
    () => buildEligibleLookupParams(articleNumber, sku),
    [articleNumber, sku],
  );
  const hasEligibleLookupParams = Boolean(
    eligibleLookupParams.article_number ?? eligibleLookupParams.sku,
  );

  const query = useShopifyCustomerLookupQuery(eligibleLookupParams, {
    enabled: enabled && hasEligibleLookupParams,
  });
  const retry = useCallback(() => {
    if (
      !enabled ||
      !hasEligibleLookupParams ||
      query.isFetching ||
      retryInFlightRef.current
    ) {
      return;
    }

    retryInFlightRef.current = true;
    void Promise.resolve(query.refetch()).finally(() => {
      retryInFlightRef.current = false;
    });
  }, [enabled, hasEligibleLookupParams, query.isFetching, query.refetch]);

  const injectMappedFields = useEffectEvent(
    (
      mappedFields: Partial<
        Record<CustomerPrefillPath, PrefillFieldValue | undefined>
      >,
    ) => {
      const nextInjectedValues: LastInjectedValues = {};

      for (const [path, value] of Object.entries(mappedFields) as Array<
        [CustomerPrefillPath, PrefillFieldValue | undefined]
      >) {
        if (value == null || value === "") {
          continue;
        }

        const typedPath = path as FieldPath<TFormValues>;
        const currentValue = normalizeCurrentFormValue(form.getValues(typedPath));
        const lastInjectedValue = lastInjectedValuesRef.current[path];
        // An empty value is also a manual edit. Without comparing it to the
        // last injected value, clearing a Shopify-prefilled field would be
        // interpreted as an untouched field and the value would be restored.
        const userHasDiverged =
          currentValue !== lastInjectedValue && currentValue !== value;

        if (userHasDiverged) {
          continue;
        }

        form.setValue(typedPath, value as FieldPathValue<
          TFormValues,
          FieldPath<TFormValues>
        >, {
          shouldDirty: true,
        });
        nextInjectedValues[path] = value;
      }

      lastInjectedValuesRef.current = {
        ...lastInjectedValuesRef.current,
        ...nextInjectedValues,
      };
    },
  );

  useEffect(() => {
    if (!enabled || !hasEligibleLookupParams || !query.data) {
      return;
    }

    const selectedResult = selectBestShopifyCustomerLookupResult(
      query.data.customer_matches,
      eligibleLookupParams,
    );

    if (!selectedResult) {
      return;
    }

    injectMappedFields(
      mapShopifyCustomerLookupResultToFormFields(selectedResult),
    );
  }, [
    enabled,
    hasEligibleLookupParams,
    injectMappedFields,
    eligibleLookupParams,
    query.data,
  ]);

  if (!enabled || !hasEligibleLookupParams) {
    return { status: "idle", retry };
  }

  if (query.isPending || query.isFetching) {
    return { status: "loading", retry };
  }

  if (query.isSuccess && query.data.customer_matches.length > 0) {
    return { status: "found", retry };
  }

  if (query.isError || query.isSuccess) {
    return { status: "not_found", retry };
  }

  return { status: "idle", retry };
}
