import { ArrowLeft } from "lucide-react";

import { cn } from "@beyo/lib";

import type { EmailThreadHeaderAction } from "../types";

type EmailThreadHeaderProps = {
  subject: string;
  actions: EmailThreadHeaderAction[];
  isHidden: boolean;
  onBack: () => void;
};

function getActionClassName(tone: EmailThreadHeaderAction["tone"]): string {
  switch (tone) {
    case "success":
      return "text-[var(--color-success)]";
    case "destructive":
      return "text-[var(--color-destructive)]";
    default:
      return "text-muted-foreground";
  }
}

export function EmailThreadHeader({
  subject,
  actions,
  isHidden,
  onBack,
}: EmailThreadHeaderProps): React.JSX.Element {
  return (
    <div
      className="absolute inset-x-0 top-0 z-10 bg-background"
      style={{
        transform:
          "translateY(calc(-1 * var(--header-height, 72px) * var(--scroll-hide-progress, 0)))",
        transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
        pointerEvents: isHidden ? "none" : undefined,
      }}
    >
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <button
            aria-label="Back to inbox"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {subject || "Conversation"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {actions.map((action) => (
              <button
                key={action.label}
                className={cn(
                  "flex items-center gap-1 text-sm font-medium disabled:opacity-50",
                  getActionClassName(action.tone),
                )}
                disabled={action.disabled}
                type="button"
                onClick={() => {
                  // onPress may reject (the owner surfaces its own error toast);
                  // swallow here so the rejection is not left unhandled.
                  void Promise.resolve(action.onPress()).catch(() => {});
                }}
              >
                <action.icon className="size-4" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
