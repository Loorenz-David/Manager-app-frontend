import { AnimatePresence, m } from "framer-motion";
import { ScanLine } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import {
  BoxSlidePicker,
  FieldErrorPill,
  TextInput,
} from "@/components/primitives";
import type { BoxSlidePickerOptionType } from "@/components/primitives";
import { transitions } from "@/lib/animation";

const STORAGE_KEY = "item-identity-field-active-tab";

const IDENTITY_TABS = ["article_number", "sku"] as const;
type IdentityTab = (typeof IDENTITY_TABS)[number];

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

function readStoredTab(): IdentityTab {
  try {
    const storedTab = localStorage.getItem(STORAGE_KEY);
    if (storedTab === "article_number" || storedTab === "sku") {
      return storedTab;
    }
  } catch {}

  return "article_number";
}

export function ItemIdentityField(): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const itemErrors = errors as { item?: Record<string, { message?: string }> };
  const articleNumberError = itemErrors.item?.article_number?.message;
  const skuError = itemErrors.item?.sku?.message;

  const [activeTab, setActiveTab] = useState<IdentityTab>(readStoredTab);
  const [direction, setDirection] = useState<1 | -1>(1);

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
                rightIcon={
                  <button
                    aria-label="Scan article number"
                    className="pointer-events-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    data-testid="item-article-number-scan-button"
                    type="button"
                    onClick={() => {
                      console.log("opening scanner...");
                    }}
                  >
                    <ScanLine className="size-4" />
                  </button>
                }
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
                rightIcon={
                  <button
                    aria-label="Scan SKU"
                    className="pointer-events-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    data-testid="item-sku-scan-button"
                    type="button"
                    onClick={() => {
                      console.log("opening scanner...");
                    }}
                  >
                    <ScanLine className="size-4" />
                  </button>
                }
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
