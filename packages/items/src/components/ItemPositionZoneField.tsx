import { AnimatePresence, m } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import { transitions } from "@beyo/lib";
import {
  BoxSlidePicker,
  FieldErrorPill,
  NumericKeyboardBar,
  TextInput,
  type BoxSlidePickerOptionType,
} from "@beyo/ui";

import { useItemLocationQuery } from "../api/use-item-location-query";
import { normalizeArticleNumberForLookup } from "../lib/normalize-article-number";
import type { ItemLocationResult } from "../types";

const LOOKUP_DEBOUNCE_MS = 400;
const POSITION_TABS = ["zone", "position"] as const;

type PositionTab = (typeof POSITION_TABS)[number];

type ItemPositionZoneFieldProps = {
  defaultTab?: PositionTab;
  articleNumber?: string | null;
  sku?: string | null;
  disableLookup?: boolean;
  positionErrorRevealNonce?: number;
};

const TAB_OPTIONS: readonly BoxSlidePickerOptionType<PositionTab>[] = [
  {
    value: "zone",
    label: "Zone",
    testId: "item-zone-tab",
    ariaLabel: "Zone input",
  },
  {
    value: "position",
    label: "Wagon",
    testId: "item-position-tab",
    ariaLabel: "Wagon input",
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

function capitalizeZone(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (match) => match.toLocaleUpperCase());
}

function getPreciseLocationMatch(
  items: ItemLocationResult[],
  identity: string,
  source: "sku" | "article_number",
): ItemLocationResult | null {
  if (!identity) {
    return null;
  }

  for (const item of items) {
    if (source === "sku") {
      if ((item.sku ?? "").trim() === identity) {
        return item;
      }
      continue;
    }

    if (
      normalizeArticleNumberForLookup((item.item_article_number ?? "").trim()) ===
      identity
    ) {
      return item;
    }
  }

  return null;
}

function shouldApplyLookupZone(args: {
  currentZone: string;
  nextZone: string;
  previousAutoAppliedZone: string;
  zoneDirty: boolean;
  signature: string;
  lastAppliedSignature: string | null;
}): boolean {
  const {
    currentZone,
    nextZone,
    previousAutoAppliedZone,
    zoneDirty,
    signature,
    lastAppliedSignature,
  } = args;

  const hasUserModifiedZone =
    zoneDirty &&
    currentZone.length > 0 &&
    currentZone !== previousAutoAppliedZone;
  const canOverwriteCurrentZone =
    currentZone.length === 0 || currentZone === previousAutoAppliedZone;

  return (
    nextZone.length > 0 &&
    !hasUserModifiedZone &&
    canOverwriteCurrentZone &&
    lastAppliedSignature !== signature
  );
}

export function ItemPositionZoneField({
  defaultTab = "position",
  articleNumber,
  sku,
  disableLookup = false,
  positionErrorRevealNonce = 0,
}: ItemPositionZoneFieldProps): React.JSX.Element {
  const {
    control,
    formState: { dirtyFields, errors },
  } = useFormContext();
  const itemErrors = errors as { item?: Record<string, { message?: string }> };
  const zoneError = itemErrors.item?.item_zone?.message;
  const positionError = itemErrors.item?.item_position?.message;
  const zoneField = useController({ control, name: "item.item_zone" }).field;
  const positionField = useController({
    control,
    name: "item.item_position",
  }).field;

  const [activeTab, setActiveTab] = useState<PositionTab>(defaultTab);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isZoneFocused, setIsZoneFocused] = useState(false);
  const [isPositionFocused, setIsPositionFocused] = useState(false);
  const lastAppliedLookupSignatureRef = useRef<string | null>(null);
  const previousAutoAppliedZoneRef = useRef<string>("");
  const previousPositionErrorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const revealPositionTab = useEffectEvent(() => {
    if (activeTab === "position") {
      return;
    }

    const currentIndex = POSITION_TABS.indexOf(activeTab);
    const nextIndex = POSITION_TABS.indexOf("position");
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab("position");
  });

  useEffect(() => {
    if (
      positionError &&
      !previousPositionErrorRef.current
    ) {
      revealPositionTab();
    }
    previousPositionErrorRef.current = positionError;
  }, [positionError, revealPositionTab]);

  useEffect(() => {
    if (!positionError) {
      return;
    }

    revealPositionTab();
  }, [positionError, positionErrorRevealNonce, revealPositionTab]);

  const identitySource = sku?.trim() ? "sku" : "article_number";
  const rawLookupIdentity =
    identitySource === "sku"
      ? sku?.trim() ?? ""
      : normalizeArticleNumberForLookup(articleNumber?.trim() ?? "");
  const debouncedLookupIdentity = useDebouncedValue(
    rawLookupIdentity,
    LOOKUP_DEBOUNCE_MS,
  );
  const isLookupEnabled =
    !disableLookup &&
    activeTab === "zone" &&
    debouncedLookupIdentity.length > 0;
  const locationQuery = useItemLocationQuery(
    { q: debouncedLookupIdentity },
    { enabled: isLookupEnabled },
  );

  const applyLookupMatch = useEffectEvent((items: ItemLocationResult[]) => {
    const match = getPreciseLocationMatch(
      items,
      debouncedLookupIdentity,
      identitySource,
    );
    const nextZone = match?.item_position?.trim() ?? "";
    const currentZone = zoneField.value?.trim?.() ?? "";
    const previousAutoAppliedZone =
      previousAutoAppliedZoneRef.current.trim();
    const zoneDirty = Boolean(dirtyFields.item?.item_zone);
    const signature = `${identitySource}:${debouncedLookupIdentity}:${nextZone}`;

    if (
      !match ||
      !shouldApplyLookupZone({
        currentZone,
        nextZone,
        previousAutoAppliedZone,
        zoneDirty,
        signature,
        lastAppliedSignature: lastAppliedLookupSignatureRef.current,
      })
    ) {
      return;
    }

    zoneField.onChange(nextZone);
    lastAppliedLookupSignatureRef.current = signature;
    previousAutoAppliedZoneRef.current = nextZone;
  });

  useEffect(() => {
    if (!isLookupEnabled || locationQuery.status !== "success") {
      return;
    }

    applyLookupMatch(locationQuery.data.items);
  }, [
    applyLookupMatch,
    isLookupEnabled,
    locationQuery.data,
    locationQuery.status,
  ]);

  function handleTabChange(nextTab: PositionTab) {
    const currentIndex = POSITION_TABS.indexOf(activeTab);
    const nextIndex = POSITION_TABS.indexOf(nextTab);

    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(nextTab);
  }

  const rightIcon =
    activeTab === "zone" && isLookupEnabled && locationQuery.isFetching ? (
      <span
        aria-label="Looking up zone"
        className="flex size-8 items-center justify-center text-muted-foreground"
        data-testid="item-zone-loading-indicator"
      >
        <Loader2 className="size-4 animate-spin" />
      </span>
    ) : undefined;

  return (
    <div className="flex flex-col gap-2" data-testid="item-position-zone-field">
      <BoxSlidePicker
        className="w-auto self-start bg-[var(--color-between-border)]/60"
        dataTestId="item-position-zone-tab-picker"
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
            {activeTab === "zone" ? (
              <div className="flex flex-col gap-1.5">
                <TextInput
                  autoCapitalize="characters"
                  data-testid="item-zone-input"
                  id="item-zone"
                  invalid={Boolean(zoneError)}
                  placeholder="e.g. North"
                  rightIcon={rightIcon}
                  type="text"
                  value={zoneField.value ?? ""}
                  onBlur={() => {
                    setIsZoneFocused(false);
                    zoneField.onBlur();
                  }}
                  onChange={(event) =>
                    zoneField.onChange(event.target.value.toLocaleUpperCase())
                  }
                  onFocus={() => setIsZoneFocused(true)}
                />
                <NumericKeyboardBar
                  hasFocus={isZoneFocused}
                  value={zoneField.value ?? ""}
                  onChange={(next) => zoneField.onChange(next)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <TextInput
                  data-testid="item-position-input"
                  id="item-position"
                  invalid={Boolean(positionError)}
                  placeholder="e.g. 3"
                  type="text"
                  value={positionField.value ?? ""}
                  onBlur={() => {
                    setIsPositionFocused(false);
                    positionField.onBlur();
                  }}
                  onChange={(event) => positionField.onChange(event.target.value)}
                  onFocus={() => setIsPositionFocused(true)}
                />
                <NumericKeyboardBar
                  hasFocus={isPositionFocused}
                  value={positionField.value ?? ""}
                  onChange={(next) => positionField.onChange(next)}
                />
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>
      <FieldErrorPill
        data-testid={
          activeTab === "zone" ? "item-zone-error" : "item-position-error"
        }
        message={activeTab === "zone" ? zoneError : positionError}
      />
    </div>
  );
}

export { capitalizeZone, getPreciseLocationMatch, shouldApplyLookupZone };
