import { m } from "framer-motion";
import {
  Activity,
  AtSign,
  Bold,
  CaseSensitive,
  Palette,
  Underline,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@beyo/lib";

import {
  CaseColorPalette,
  type CaseComposerColorToken,
} from "./CaseColorPalette";
import type { CaseComposerToolbarState } from "../../lib/case-lexical-serialization";

type CaseComposerToolbarActionKey =
  | "bold"
  | "underline"
  | "big"
  | "color"
  | "shake"
  | "pulse"
  | "mention";

type CaseComposerToolbarActions = Record<
  CaseComposerToolbarActionKey,
  () => void
>;

type CaseComposerToolbarProps = {
  actions: CaseComposerToolbarActions;
  disabled?: boolean;
  expandedColorToken?: CaseComposerColorToken | null;
  expandedTool?: "color" | null;
  onCollapseExpandedTool?: () => void;
  onSelectExpandedColor?: (colorToken: CaseComposerColorToken) => void;
  pulsePreviewTick?: number;
  shakePreviewTick?: number;
  state: CaseComposerToolbarState;
};

type ToolbarButtonConfig = {
  actionKey: CaseComposerToolbarActionKey;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  isToggle: boolean;
  label?: string;
  testId: string;
};

const BUTTONS: ToolbarButtonConfig[] = [
  {
    actionKey: "bold",
    ariaLabel: "Bold",
    icon: Bold,
    isToggle: true,
    testId: "case-composer-toolbar-bold",
  },
  {
    actionKey: "underline",
    ariaLabel: "Underline",
    icon: Underline,
    isToggle: true,
    testId: "case-composer-toolbar-underline",
  },
  {
    actionKey: "big",
    ariaLabel: "Bigger text",
    icon: CaseSensitive,
    isToggle: true,
    testId: "case-composer-toolbar-big",
  },
  {
    actionKey: "color",
    ariaLabel: "Color",
    icon: Palette,
    isToggle: true,
    testId: "case-composer-toolbar-color",
  },
  {
    actionKey: "shake",
    ariaLabel: "Shake animation",
    icon: Zap,
    isToggle: true,
    label: "Shake",
    testId: "case-composer-toolbar-shake",
  },
  {
    actionKey: "pulse",
    ariaLabel: "Pulse animation",
    icon: Activity,
    isToggle: true,
    label: "Pulse",
    testId: "case-composer-toolbar-pulse",
  },
  {
    actionKey: "mention",
    ariaLabel: "Mention",
    icon: AtSign,
    isToggle: false,
    testId: "case-composer-toolbar-mention",
  },
];

function renderAnimatedIcon(
  actionKey: CaseComposerToolbarActionKey,
  Icon: React.ComponentType<{ className?: string }>,
  previewTick: number,
  label?: string,
): React.ReactNode {
  const iconEl = <Icon className="size-4" />;
  const content =
    label !== undefined ? (
      <>
        {iconEl}
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
          {label}
        </span>
      </>
    ) : (
      iconEl
    );

  if (previewTick === 0 || (actionKey !== "shake" && actionKey !== "pulse")) {
    return content;
  }

  if (actionKey === "shake") {
    return (
      <m.span
        animate={{ rotate: [0, -8, 8, -6, 6, 0] }}
        className="inline-flex items-center gap-1.5"
        initial={{ rotate: 0 }}
        key={`${actionKey}-${previewTick}`}
        transition={{ duration: 0.32, ease: "easeInOut" }}
      >
        {content}
      </m.span>
    );
  }

  return (
    <m.span
      animate={{ scale: [1, 1.16, 1] }}
      className="inline-flex items-center gap-1.5"
      initial={{ scale: 1 }}
      key={`${actionKey}-${previewTick}`}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      {content}
    </m.span>
  );
}

export function CaseComposerToolbar({
  actions,
  disabled = false,
  expandedColorToken = null,
  expandedTool = null,
  onCollapseExpandedTool,
  onSelectExpandedColor,
  pulsePreviewTick = 0,
  shakePreviewTick = 0,
  state,
}: CaseComposerToolbarProps): React.JSX.Element {
  if (expandedTool === "color") {
    return (
      <div
        className="overflow-hidden px-1 py-1"
        data-testid="case-composer-toolbar"
      >
        <div
          className="flex min-h-10 w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
          data-testid="case-composer-toolbar-expanded-color"
        >
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Color
          </span>
          <CaseColorPalette
            activeToken={expandedColorToken}
            disabled={disabled}
            onSelectToken={onSelectExpandedColor}
          />
          <button
            aria-label="Clear color and collapse"
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground transition-colors duration-150 hover:border-primary/35 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
            data-testid="case-composer-toolbar-expanded-dismiss"
            disabled={disabled}
            onClick={onCollapseExpandedTool}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 overflow-x-auto px-1 py-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
      data-testid="case-composer-toolbar"
    >
      {BUTTONS.map((button) => {
        const isActive =
          button.isToggle && button.actionKey !== "mention"
            ? state[button.actionKey]
            : false;
        const previewTick =
          button.actionKey === "shake"
            ? shakePreviewTick
            : button.actionKey === "pulse"
              ? pulsePreviewTick
              : 0;

        return (
          <button
            aria-label={button.ariaLabel}
            aria-pressed={button.isToggle ? isActive : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 shadow-sm transition-all duration-150",
              isActive
                ? "border-primary bg-primary text-card "
                : "border-border/80 bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
            data-state={
              button.isToggle ? (isActive ? "active" : "inactive") : "idle"
            }
            data-testid={button.testId}
            disabled={disabled}
            key={button.testId}
            onClick={actions[button.actionKey]}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            type="button"
          >
            {renderAnimatedIcon(
              button.actionKey,
              button.icon,
              previewTick,
              button.label,
            )}
          </button>
        );
      })}
    </div>
  );
}
