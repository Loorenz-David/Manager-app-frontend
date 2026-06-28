import { useMemo, useState } from "react";

import { useScrollVisibilityContext } from "../scroll-visibility";
import { cn } from "@beyo/lib";

import { HorizontalScrollArea } from "../horizontal-scroll-area";

type WorkingSectionOption = {
  client_id: string;
  name: string;
};

type WorkingSectionShortcutConfig = Record<string, string[]>;

export type WorkingSectionShortcutBarProps = {
  shortcuts: WorkingSectionShortcutConfig;
  availableSections: WorkingSectionOption[];
  selectedSectionIds: string[];
  onShortcutPress: (matchedIds: string[]) => void;
  animationMode?: "collapse" | "translate";
  className?: string;
  trackClassName?: string;
  "data-testid"?: string;
};

function areSameSectionSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function toShortcutTestId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function WorkingSectionShortcutBar({
  shortcuts,
  availableSections,
  selectedSectionIds,
  onShortcutPress,
  animationMode = "collapse",
  className,
  trackClassName,
  "data-testid": testId = "working-section-shortcut-bar",
}: WorkingSectionShortcutBarProps): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();
  const [lastPressedLabel, setLastPressedLabel] = useState<string | null>(null);

  const pillEntries = useMemo(
    () =>
      Object.entries(shortcuts).map(([label, patterns]) => {
        const normalizedPatterns = patterns.map((pattern) =>
          pattern.toLowerCase(),
        );
        const matchedIds = availableSections
          .filter((section) =>
            normalizedPatterns.some((pattern) =>
              section.name.toLowerCase().includes(pattern),
            ),
          )
          .map((section) => section.client_id);

        return { label, matchedIds };
      }),
    [availableSections, shortcuts],
  );

  const activePillLabel = useMemo(() => {
    if (!lastPressedLabel) {
      return null;
    }

    const activeEntry = pillEntries.find(
      (entry) => entry.label === lastPressedLabel,
    );
    if (!activeEntry) {
      return null;
    }

    return areSameSectionSet(activeEntry.matchedIds, selectedSectionIds)
      ? lastPressedLabel
      : null;
  }, [lastPressedLabel, pillEntries, selectedSectionIds]);

  return (
    <div
      className={cn(
        animationMode === "translate"
          ? [
              "will-change-transform",
              isHidden ? "pointer-events-none" : null,
            ]
          : [
              "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
              isHidden
                ? "pointer-events-none max-h-0 opacity-0"
                : "max-h-24 opacity-100",
            ],
        className,
      )}
      data-testid={testId}
      style={
        animationMode === "translate"
          ? {
              transform:
                "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
              opacity: "calc(1 - var(--scroll-hide-progress, 0))",
              transition:
                "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
            }
          : undefined
      }
    >
      <HorizontalScrollArea trackClassName={trackClassName}>
        <div className="flex min-w-max items-center gap-2">
          {pillEntries.map(({ label, matchedIds }) => {
            const isActive = activePillLabel === label;

            return (
              <button
                key={label}
                type="button"
                aria-pressed={isActive}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  isActive
                    ? "border-primary bg-primary text-card"
                    : "border-border border-dashed bg-card text-muted-foreground hover:bg-muted/20 active:bg-card/80",
                )}
                data-testid={`shortcut-pill-${toShortcutTestId(label)}`}
                onClick={() => {
                  if (isActive) {
                    setLastPressedLabel(null);
                    onShortcutPress([]);
                    return;
                  }

                  setLastPressedLabel(label);
                  onShortcutPress(matchedIds);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </HorizontalScrollArea>
    </div>
  );
}
