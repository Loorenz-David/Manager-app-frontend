import { AnimatePresence, m } from "framer-motion";
import { Check, Loader2, ScanLine, X } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { transitions } from "@beyo/lib";
import {
  BoxSlidePicker,
  FieldErrorPill,
  TextInput,
  type BoxSlidePickerOptionType,
} from "@beyo/ui";

import { useItemLookupQuery } from "../api/use-item-lookup-query";
import type { ItemLookupResult } from "../types";

const STORAGE_KEY = "item-identity-field-active-tab";

const IDENTITY_TABS = ["article_number", "sku"] as const;
type IdentityTab = (typeof IDENTITY_TABS)[number];

type ItemIdentityFieldProps = {
  onOpenScanner?: (tab: IdentityTab) => void;
  onLookupResult?: (items: ItemLookupResult[]) => boolean | "invalid";
};

const ARTICLE_NUMBER_MIN_LENGTH = 7;
const PADDED_ARTICLE_NUMBER_MIN_RAW_LENGTH = 3;
const SKU_MIN_LENGTH = 4;
const LOOKUP_DEBOUNCE_MS = 400;
const LOOKUP_SUCCESS_FLASH_MS = 2000;

const TAB_OPTIONS: readonly BoxSlidePickerOptionType<IdentityTab>[] = [
  {
    value: "article_number",
    label: "Article number",
    testId: "item-identity-article-number-tab",
    ariaLabel: "Article number input",
  },
  {
    value: "sku",
    label: "SKU",
    testId: "item-identity-sku-tab",
    ariaLabel: "SKU input",
  },
] as const;

const inputVariants = {
  enter: (direction: 1 | -1) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
} as const;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

function readStoredTab(): IdentityTab {
  try {
    const storedTab = localStorage.getItem(STORAGE_KEY);
    if (storedTab === "article_number" || storedTab === "sku") {
      return storedTab;
    }
  } catch {}

  return "article_number";
}

function normalizeArticleNumberForLookup(articleNumber: string): string {
  if (!/^\d+$/.test(articleNumber)) {
    return articleNumber;
  }

  if (articleNumber.startsWith("0")) {
    return articleNumber;
  }

  return articleNumber.padStart(ARTICLE_NUMBER_MIN_LENGTH, "0");
}

export function ItemIdentityField({
  onOpenScanner,
  onLookupResult,
}: ItemIdentityFieldProps): React.JSX.Element {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();
  const itemErrors = errors as { item?: Record<string, { message?: string }> };
  const articleNumberError = itemErrors.item?.article_number?.message;
  const skuError = itemErrors.item?.sku?.message;

  const [activeTab, setActiveTab] = useState<IdentityTab>(readStoredTab);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [lookupStatus, setLookupStatus] = useState<"valid" | "invalid" | null>(null);
  const articleNumber = useWatch({
    control,
    name: "item.article_number",
  });
  const sku = useWatch({
    control,
    name: "item.sku",
  });
  const debouncedArticleNumber = useDebouncedValue(
    articleNumber?.trim() ?? "",
    LOOKUP_DEBOUNCE_MS,
  );
  const debouncedSku = useDebouncedValue(sku?.trim() ?? "", LOOKUP_DEBOUNCE_MS);
  const normalizedDebouncedArticleNumber = normalizeArticleNumberForLookup(
    debouncedArticleNumber,
  );

  const lookupParams =
    activeTab === "article_number"
      ? { article_number: normalizedDebouncedArticleNumber }
      : { sku: debouncedSku };
  const isLookupEnabled =
    activeTab === "article_number"
      ? /^\d+$/.test(debouncedArticleNumber)
        ? debouncedArticleNumber.length >= PADDED_ARTICLE_NUMBER_MIN_RAW_LENGTH
        : debouncedArticleNumber.length >= ARTICLE_NUMBER_MIN_LENGTH
      : debouncedSku.length >= SKU_MIN_LENGTH;
  const lookupQuery = useItemLookupQuery(lookupParams, {
    enabled: isLookupEnabled,
  });
  const emitLookupResult = useEffectEvent(
    (items: ItemLookupResult[]) => onLookupResult?.(items) ?? false,
  );

  useEffect(() => {
    if (!isLookupEnabled || lookupQuery.status !== "success") {
      return;
    }

    const result = emitLookupResult(lookupQuery.data.items);
    if (result === true) {
      setLookupStatus("valid");
    } else if (result === "invalid") {
      setLookupStatus("invalid");
    }
  }, [emitLookupResult, isLookupEnabled, lookupQuery.data, lookupQuery.status]);

  useEffect(() => {
    if (!lookupStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLookupStatus(null);
    }, LOOKUP_SUCCESS_FLASH_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [lookupStatus]);

  useEffect(() => {
    setLookupStatus(null);
  }, [activeTab]);

  function handleTabChange(nextTab: IdentityTab) {
    const currentIndex = IDENTITY_TABS.indexOf(activeTab);
    const nextIndex = IDENTITY_TABS.indexOf(nextTab);

    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(nextTab);

    try {
      localStorage.setItem(STORAGE_KEY, nextTab);
    } catch {}
  }

  const activeError =
    activeTab === "article_number" ? articleNumberError : skuError;
  const isLookupLoading = isLookupEnabled && lookupQuery.isFetching;
  const activeStatus = isLookupLoading ? null : lookupStatus;

  function handleScannerPress(): void {
    onOpenScanner?.(activeTab);
  }

  const scannerButtonClassName =
    "pointer-events-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground";
  const validButtonClassName =
    "pointer-events-auto flex size-8 items-center justify-center rounded-full bg-green-600 text-white transition-transform hover:scale-[1.02]";
  const invalidButtonClassName =
    "pointer-events-auto flex size-8 items-center justify-center rounded-full bg-red-500 text-white transition-transform hover:scale-[1.02]";

  const rightIcon = isLookupLoading ? (
    <span
      aria-label="Looking up item"
      className="flex size-8 items-center justify-center text-muted-foreground"
      data-testid={
        activeTab === "article_number"
          ? "item-article-number-loading-indicator"
          : "item-sku-loading-indicator"
      }
    >
      <Loader2 className="size-4 animate-spin" />
    </span>
  ) : activeStatus === "valid" ? (
    <button
      aria-label={
        activeTab === "article_number" ? "Scan article number" : "Scan SKU"
      }
      className={validButtonClassName}
      data-testid={
        activeTab === "article_number"
          ? "item-article-number-success-button"
          : "item-sku-success-button"
      }
      type="button"
      onClick={handleScannerPress}
    >
      <Check className="size-4" />
    </button>
  ) : activeStatus === "invalid" ? (
    <button
      aria-label={
        activeTab === "article_number" ? "Scan article number" : "Scan SKU"
      }
      className={invalidButtonClassName}
      data-testid={
        activeTab === "article_number"
          ? "item-article-number-invalid-button"
          : "item-sku-invalid-button"
      }
      type="button"
      onClick={handleScannerPress}
    >
      <X className="size-4" />
    </button>
  ) : (
    <button
      aria-label={
        activeTab === "article_number" ? "Scan article number" : "Scan SKU"
      }
      className={scannerButtonClassName}
      data-testid={
        activeTab === "article_number"
          ? "item-article-number-scan-button"
          : "item-sku-scan-button"
      }
      type="button"
      onClick={handleScannerPress}
    >
      <ScanLine className="size-4" />
    </button>
  );

  return (
    <div className="flex flex-col gap-2" data-testid="item-identity-field">
      <BoxSlidePicker
        className="w-auto self-start bg-[var(--color-between-border)]/60"
        dataTestId="item-identity-tab-picker"
        distribution="content"
        options={TAB_OPTIONS}
        size="sm"
        value={activeTab}
        onValueChange={handleTabChange}
      />
      <div className="overflow-hidden">
        <AnimatePresence custom={direction} initial={false} mode="wait">
          <m.div
            key={activeTab}
            animate="center"
            custom={direction}
            exit="exit"
            initial="enter"
            transition={transitions.slide}
            variants={inputVariants}
          >
            {activeTab === "article_number" ? (
              <TextInput
                autoCapitalize="characters"
                data-testid="item-article-number-input"
                id="item-article-number"
                invalid={Boolean(articleNumberError)}
                placeholder="e.g. KN-123"
                rightIcon={rightIcon}
                type="text"
                {...register("item.article_number")}
              />
            ) : (
              <TextInput
                autoCapitalize="characters"
                data-testid="item-sku-input"
                id="item-sku"
                invalid={Boolean(skuError)}
                placeholder="e.g. SKU-456"
                rightIcon={rightIcon}
                type="text"
                {...register("item.sku")}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>
      <FieldErrorPill
        data-testid={
          activeTab === "article_number"
            ? "item-article-number-error"
            : "item-sku-error"
        }
        message={activeError}
      />
    </div>
  );
}
