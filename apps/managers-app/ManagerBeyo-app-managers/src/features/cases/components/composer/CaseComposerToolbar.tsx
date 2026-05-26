import { m } from "framer-motion";

import { cn } from "@/lib/utils";

import type { CaseComposerToolbarState } from "../../lib/case-lexical-serialization";

type CaseComposerToolbarActionKey =
  | "bold"
  | "underline"
  | "big"
  | "small"
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
  pulsePreviewTick?: number;
  shakePreviewTick?: number;
  state: CaseComposerToolbarState;
};

type ToolbarButtonConfig = {
  actionKey: CaseComposerToolbarActionKey;
  ariaLabel?: string;
  isToggle: boolean;
  label: string;
  testId: string;
};

const BUTTONS: ToolbarButtonConfig[] = [
  {
    actionKey: "bold",
    isToggle: true,
    label: "Bold",
    testId: "case-composer-toolbar-bold",
  },
  {
    actionKey: "underline",
    isToggle: true,
    label: "Underline",
    testId: "case-composer-toolbar-underline",
  },
  {
    actionKey: "big",
    isToggle: true,
    label: "Big",
    testId: "case-composer-toolbar-big",
  },
  {
    actionKey: "small",
    isToggle: true,
    label: "Small",
    testId: "case-composer-toolbar-small",
  },
  {
    actionKey: "color",
    isToggle: true,
    label: "Color",
    testId: "case-composer-toolbar-color",
  },
  {
    actionKey: "shake",
    isToggle: true,
    label: "Shake",
    testId: "case-composer-toolbar-shake",
  },
  {
    actionKey: "pulse",
    isToggle: true,
    label: "Pulse",
    testId: "case-composer-toolbar-pulse",
  },
  {
    actionKey: "mention",
    ariaLabel: "Mention",
    isToggle: false,
    label: "@",
    testId: "case-composer-toolbar-mention",
  },
];

function renderAnimatedLabel(
  actionKey: CaseComposerToolbarActionKey,
  label: string,
  previewTick: number,
): React.ReactNode {
  if (previewTick === 0 || (actionKey !== "shake" && actionKey !== "pulse")) {
    return label;
  }

  if (actionKey === "shake") {
    return (
      <m.span
        animate={{ rotate: [0, -8, 8, -6, 6, 0] }}
        initial={{ rotate: 0 }}
        key={`${actionKey}-${previewTick}`}
        transition={{ duration: 0.32, ease: "easeInOut" }}
      >
        {label}
      </m.span>
    );
  }

  return (
    <m.span
      animate={{ scale: [1, 1.16, 1] }}
      initial={{ scale: 1 }}
      key={`${actionKey}-${previewTick}`}
      transition={{ duration: 0.36, ease: "easeOut" }}
    >
      {label}
    </m.span>
  );
}

export function CaseComposerToolbar({
  actions,
  disabled = false,
  pulsePreviewTick = 0,
  shakePreviewTick = 0,
  state,
}: CaseComposerToolbarProps): React.JSX.Element {
  return (
    <div
      className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
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
            aria-label={button.ariaLabel ?? button.label}
            aria-pressed={button.isToggle ? isActive : undefined}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-150",
              isActive
                ? "border-primary bg-primary text-card shadow-[0_6px_16px_rgba(0,0,0,0.14)]"
                : "border-border/80 bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
            data-state={button.isToggle ? (isActive ? "active" : "inactive") : "idle"}
            data-testid={button.testId}
            disabled={disabled}
            key={button.testId}
            onClick={actions[button.actionKey]}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            type="button"
          >
            {renderAnimatedLabel(button.actionKey, button.label, previewTick)}
          </button>
        );
      })}
    </div>
  );
}
