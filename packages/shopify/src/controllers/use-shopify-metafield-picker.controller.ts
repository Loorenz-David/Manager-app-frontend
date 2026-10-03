import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateClientId } from "@beyo/lib";

import { useCreateShopifyMetafieldPreference } from "../actions/use-create-shopify-metafield-preference";
import { useDeleteShopifyMetafieldPreference } from "../actions/use-delete-shopify-metafield-preference";
import { useReorderShopifyMetafieldPreference } from "../actions/use-reorder-shopify-metafield-preference";
import { useListShopifyShopsQuery } from "../api/use-list-shopify-shops-query";
import {
  useShopifyMetafieldPreferencesCategoryQuery,
  useShopifyMetafieldPreferencesSearchInfiniteQuery,
} from "../api/use-shopify-metafield-preferences-query";
import {
  mergeShopifyMetafieldPreferencePages,
  normalizeShopifyMetafieldFields,
  normalizeUnavailableMetafieldDefinitions,
} from "../lib/normalize-shopify-metafield-fields";
import { createMetafieldFieldIdentity } from "../lib/shopify-metafield-identity";
import {
  belongsToMetafieldStep,
  fullSequenceOrderForStepDrop,
  type ShopifyMetafieldStep,
} from "../lib/shopify-metafield-step";
import { toShopifyMetafieldFormValue } from "../lib/shopify-metafield-value";
import type {
  ShopifyMetafieldField,
  ShopifyMetafieldPreference,
  ShopifyProductSyncMetafieldValue,
  ShopifyShopIntegration,
} from "../types";

const EMPTY_INTEGRATIONS: ShopifyShopIntegration[] = [];

function toOptimisticSavedField(
  field: ShopifyMetafieldField,
  preferenceClientId: string,
): ShopifyMetafieldField {
  return {
    ...field,
    source: "saved_preference",
    preferenceClientId,
  };
}

function toOptimisticPreference(
  field: ShopifyMetafieldField,
  itemCategoryId: string,
  clientId: string,
): ShopifyMetafieldPreference {
  return {
    client_id: clientId,
    item_category_id: itemCategoryId,
    shop_integration_id: field.shopIntegrationId,
    shopify_metafield_definition_id: field.shopifyMetafieldDefinitionId,
    name: field.name,
    namespace: field.namespace,
    key: field.key,
    description: field.description,
    type: field.type,
    validations: field.validations,
    sequence_order: field.sequenceOrder,
    is_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: null,
    created_by: null,
  };
}

export function useShopifyMetafieldPickerController({
  shopIntegrationIds,
  itemCategoryId,
  value,
  onChange,
  step,
}: {
  shopIntegrationIds: string[];
  itemCategoryId: string | null;
  value: ShopifyProductSyncMetafieldValue[];
  onChange: (value: ShopifyProductSyncMetafieldValue[]) => void;
  step: ShopifyMetafieldStep;
}) {
  const normalizedShopIds = useMemo(
    () => Array.from(new Set(shopIntegrationIds.filter(Boolean))),
    [shopIntegrationIds],
  );
  const selectedShopKey = normalizedShopIds.join("|");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeFields, setActiveFields] = useState<ShopifyMetafieldField[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const previousScopeRef = useRef({
    itemCategoryId,
    shopIds: normalizedShopIds,
  });
  const shopsQuery = useListShopifyShopsQuery({ limit: 100, offset: 0 });
  const createAction = useCreateShopifyMetafieldPreference();
  const deleteAction = useDeleteShopifyMetafieldPreference();
  const reorderAction = useReorderShopifyMetafieldPreference();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const hasValidSearch = debouncedQuery.trim().length > 0;
  const effectiveSearchQuery = hasValidSearch
    ? debouncedQuery
    : step === "report"
      ? "condition"
      : "";
  const categoryQuery = useShopifyMetafieldPreferencesCategoryQuery({
    shopIntegrationIds: normalizedShopIds,
    itemCategoryId,
    enabled: step === "report" || isEditMode || !hasValidSearch,
  });
  const searchQueryResult = useShopifyMetafieldPreferencesSearchInfiniteQuery({
    shopIntegrationIds: normalizedShopIds,
    q: effectiveSearchQuery,
    enabled: (hasValidSearch || step === "report") && !isEditMode,
  });
  const integrations = shopsQuery.data?.shops ?? EMPTY_INTEGRATIONS;
  const mergedCategoryData = useMemo(
    () => mergeShopifyMetafieldPreferencePages(categoryQuery.data?.pages),
    [categoryQuery.data],
  );
  const allSavedFields = useMemo(
    () =>
      normalizeShopifyMetafieldFields(
        mergedCategoryData,
        integrations,
        "saved_preference",
        itemCategoryId,
      ).filter(({ shopIntegrationId }) =>
        normalizedShopIds.includes(shopIntegrationId),
      ),
    [mergedCategoryData, integrations, itemCategoryId, selectedShopKey],
  );
  const savedFields = useMemo(
    () =>
      allSavedFields.filter((field) =>
        belongsToMetafieldStep(field.name, step),
      ),
    [allSavedFields, step],
  );
  // Filters saved preferences by the live search text — applies in both
  // edit and non-edit mode, so the search bar narrows the whole picker
  // (saved and unsaved fields alike), not just unsaved search results.
  const visibleSavedFields = useMemo(() => {
    if (!hasValidSearch) return savedFields;
    const query = debouncedQuery.trim().toLowerCase();
    return savedFields.filter((field) =>
      `${field.name} ${field.namespace} ${field.key}`
        .toLowerCase()
        .includes(query),
    );
  }, [debouncedQuery, hasValidSearch, savedFields]);
  // When a shop+category pair has zero saved preferences, the backend
  // implicitly returns all available Shopify metafield definitions as
  // `search_results` on the category response itself (no `q` needed).
  const categorySearchResults = useMemo(
    () =>
      normalizeShopifyMetafieldFields(
        mergedCategoryData,
        integrations,
        "search_result",
      ).filter(({ shopIntegrationId }) =>
        normalizedShopIds.includes(shopIntegrationId),
      ).filter((field) => belongsToMetafieldStep(field.name, step)),
    [mergedCategoryData, integrations, selectedShopKey, step],
  );
  const mergedSearchData = useMemo(
    () => mergeShopifyMetafieldPreferencePages(searchQueryResult.data?.pages),
    [searchQueryResult.data],
  );
  const searchResults = useMemo(
    () =>
      normalizeShopifyMetafieldFields(
        mergedSearchData,
        integrations,
        "search_result",
      ).filter(({ shopIntegrationId }) =>
        normalizedShopIds.includes(shopIntegrationId),
      ).filter((field) => belongsToMetafieldStep(field.name, step)),
    [mergedSearchData, integrations, selectedShopKey, step],
  );
  const unavailableDefinitions = useMemo(
    () =>
      normalizeUnavailableMetafieldDefinitions(
        mergedCategoryData,
        integrations,
      ),
    [mergedCategoryData, integrations],
  );

  // Single derivation for the non-edit-mode field list: saved preferences
  // that match the live search (or all of them, with no active search),
  // plus whichever unsaved "search_result" set is currently live — the
  // implicit empty-category browse when there's no search text, or the
  // real q-driven matches while actively searching. Recomputing the whole
  // list here (rather than only ever appending) is what lets stale matches
  // from an earlier, now-superseded query text drop out. A field the user
  // has already typed a value into is always kept regardless, so
  // in-progress input is never lost out from under them.
  useEffect(() => {
    setActiveFields((current) => {
      if (isEditMode) return visibleSavedFields;

      const baseline = [...visibleSavedFields];
      const identities = new Set(baseline.map(({ identity }) => identity));
      const addUnique = (field: ShopifyMetafieldField) => {
        if (!identities.has(field.identity)) {
          baseline.push(field);
          identities.add(field.identity);
        }
      };

      if (hasValidSearch || step === "report") {
        searchResults.forEach(addUnique);
      } else {
        categorySearchResults.forEach(addUnique);
      }

      current.forEach((field) => {
        if (
          field.source === "search_result" &&
          belongsToMetafieldStep(field.name, step) &&
          normalizedShopIds.includes(field.shopIntegrationId) &&
          Object.prototype.hasOwnProperty.call(draftValues, field.identity)
        ) {
          addUnique(field);
        }
      });

      return baseline;
    });
  }, [
    categorySearchResults,
    draftValues,
    hasValidSearch,
    isEditMode,
    normalizedShopIds,
    searchResults,
    step,
    visibleSavedFields,
  ]);

  useEffect(() => {
    const previous = previousScopeRef.current;
    if (previous.itemCategoryId !== itemCategoryId) {
      setActiveFields([]);
      setDraftValues({});
      onChange([]);
    } else {
      const removed = previous.shopIds.filter(
        (shopId) => !normalizedShopIds.includes(shopId),
      );
      if (removed.length) {
        setActiveFields((fields) =>
          fields.filter(
            ({ shopIntegrationId }) => !removed.includes(shopIntegrationId),
          ),
        );
        setDraftValues((drafts) =>
          Object.fromEntries(
            Object.entries(drafts).filter(([identity]) =>
              activeFields.some(
                (field) =>
                  field.identity === identity &&
                  !removed.includes(field.shopIntegrationId),
              ),
            ),
          ),
        );
        onChange(
          value.filter(
            ({ shopIntegrationId }) => !removed.includes(shopIntegrationId),
          ),
        );
      }
    }
    previousScopeRef.current = {
      itemCategoryId,
      shopIds: normalizedShopIds,
    };
  }, [activeFields, itemCategoryId, normalizedShopIds, onChange, value]);

  const addPreference = useCallback(
    (field: ShopifyMetafieldField) => {
      if (!itemCategoryId || isEditMode || field.source !== "search_result") {
        return;
      }
      if (savedFields.some((saved) => saved.identity === field.identity)) {
        return;
      }
      const sequenceOrder =
        allSavedFields.reduce(
          (highest, saved) =>
            saved.shopIntegrationId === field.shopIntegrationId
              ? Math.max(highest, saved.sequenceOrder)
              : highest,
          -1,
        ) + 1;
      const clientId = generateClientId("ShopifyMetafieldPreference");
      const preference = toOptimisticPreference(
        { ...field, sequenceOrder },
        itemCategoryId,
        clientId,
      );
      setActiveFields((fields) =>
        fields.map((current) =>
          current.identity === field.identity
            ? toOptimisticSavedField({ ...field, sequenceOrder }, clientId)
            : current,
        ),
      );
      createAction.createPreference({ itemCategoryId, preference });
    },
    [allSavedFields, createAction, isEditMode, itemCategoryId, savedFields],
  );

  const removePreference = useCallback(
    (field: ShopifyMetafieldField) => {
      if (!isEditMode || !field.preferenceClientId) return;
      setActiveFields((fields) =>
        fields.filter(({ identity }) => identity !== field.identity),
      );
      setDraftValues((drafts) => {
        const next = { ...drafts };
        delete next[field.identity];
        return next;
      });
      onChange(
        value.filter(
          (entry) =>
            createMetafieldFieldIdentity(
              entry.shopIntegrationId,
              entry.shopifyMetafieldDefinitionId,
            ) !== field.identity,
        ),
      );
      deleteAction.deletePreference(field.preferenceClientId);
    },
    [deleteAction, isEditMode, onChange, value],
  );

  const reorderPreference = useCallback(
    (
      field: ShopifyMetafieldField,
      group: ShopifyMetafieldField[],
      oldIndex: number,
      newIndex: number,
    ) => {
      if (!isEditMode || !field.preferenceClientId) return;
      const sequenceOrder = fullSequenceOrderForStepDrop(
        allSavedFields,
        group,
        oldIndex,
        newIndex,
      );
      if (sequenceOrder === null) return;
      reorderAction.reorderPreference({
        preferenceClientId: field.preferenceClientId,
        sequenceOrder,
      });
    },
    [allSavedFields, isEditMode, reorderAction],
  );

  const updateFieldValue = useCallback(
    (field: ShopifyMetafieldField, nextValue: string) => {
      setDraftValues((drafts) => ({
        ...drafts,
        [field.identity]: nextValue,
      }));
      const nextFormValue = toShopifyMetafieldFormValue(field, nextValue);
      const withoutField = value.filter(
        (entry) =>
          createMetafieldFieldIdentity(
            entry.shopIntegrationId,
            entry.shopifyMetafieldDefinitionId,
          ) !== field.identity,
      );
      onChange(nextFormValue ? [...withoutField, nextFormValue] : withoutField);
    },
    [onChange, value],
  );

  const valueForField = useCallback(
    (field: ShopifyMetafieldField) =>
      draftValues[field.identity] ??
      value.find(
        (entry) =>
          entry.shopIntegrationId === field.shopIntegrationId &&
          entry.shopifyMetafieldDefinitionId ===
            field.shopifyMetafieldDefinitionId,
      )?.value ??
      "",
    [draftValues, value],
  );

  const toggleEditMode = useCallback(() => {
    setIsEditMode((current) => !current);
    setSearchQuery("");
  }, []);

  const isFieldMutating = useCallback(
    (field: ShopifyMetafieldField) =>
      (createAction.isPending &&
        createAction.variables?.preference.shopify_metafield_definition_id ===
          field.shopifyMetafieldDefinitionId &&
        createAction.variables.preference.shop_integration_id ===
          field.shopIntegrationId) ||
      (deleteAction.isPending &&
        deleteAction.variables === field.preferenceClientId) ||
      (reorderAction.isPending &&
        reorderAction.variables?.preferenceClientId ===
          field.preferenceClientId),
    [createAction, deleteAction, reorderAction],
  );

  return {
    activeFields,
    searchResults,
    unavailableDefinitions: step === "metafields" ? unavailableDefinitions : [],
    searchQuery,
    setSearchQuery,
    hasValidSearch,
    shouldDisplayShopIdentity: normalizedShopIds.length > 1,
    isCategoryLoading:
      categoryQuery.isPending && categoryQuery.fetchStatus !== "idle",
    isSearchLoading:
      searchQueryResult.isFetching && !searchQueryResult.isFetchingNextPage,
    categoryError: categoryQuery.error,
    searchError: searchQueryResult.error,
    // Whichever query is currently driving unsaved "search_result" fields —
    // the real q-driven search, or the implicit empty-category browse — is
    // the one that can have more pages.
    hasMoreSearchResults: hasValidSearch || step === "report"
      ? searchQueryResult.hasNextPage
      : categoryQuery.hasNextPage,
    isLoadingMoreSearchResults: hasValidSearch || step === "report"
      ? searchQueryResult.isFetchingNextPage
      : categoryQuery.isFetchingNextPage,
    loadMoreSearchResults: () => {
      if (hasValidSearch || step === "report") {
        void searchQueryResult.fetchNextPage();
      } else {
        void categoryQuery.fetchNextPage();
      }
    },
    hasSelectedShops: normalizedShopIds.length > 0,
    hasItemCategory: Boolean(itemCategoryId),
    isEditMode,
    toggleEditMode,
    addPreference,
    removePreference,
    reorderPreference,
    isFieldMutating,
    updateFieldValue,
    valueForField,
  };
}

export type ShopifyMetafieldPickerController = ReturnType<
  typeof useShopifyMetafieldPickerController
>;
