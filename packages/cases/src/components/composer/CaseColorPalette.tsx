import { cn } from "@beyo/lib";

export const CASE_COMPOSER_COLOR_OPTIONS = [
  {
    label: "Default",
    swatch: "linear-gradient(135deg, #f4f4f4 0%, #d0d3d9 100%)",
    token: "default",
    value: null,
  },
  {
    label: "Accent",
    swatch: "#d85f1d",
    token: "accent",
    value: "#d85f1d",
  },
  {
    label: "Ocean",
    swatch: "#2563eb",
    token: "ocean",
    value: "#2563eb",
  },
  {
    label: "Forest",
    swatch: "#15803d",
    token: "forest",
    value: "#15803d",
  },
  {
    label: "Rose",
    swatch: "#e11d48",
    token: "rose",
    value: "#e11d48",
  },
] as const;

export type CaseComposerColorToken =
  (typeof CASE_COMPOSER_COLOR_OPTIONS)[number]["token"];

type CaseColorPaletteProps = {
  activeToken: CaseComposerColorToken | null;
  disabled?: boolean;
  onSelectToken?: (token: CaseComposerColorToken) => void;
};

export function getCaseComposerColorValue(
  token: CaseComposerColorToken,
): string | null {
  return (
    CASE_COMPOSER_COLOR_OPTIONS.find((option) => option.token === token)
      ?.value ?? null
  );
}

export function getCaseComposerColorToken(
  colorValue: string | null | undefined,
): CaseComposerColorToken {
  if (!colorValue) {
    return "default";
  }

  return (
    CASE_COMPOSER_COLOR_OPTIONS.find((option) => option.value === colorValue)
      ?.token ?? "default"
  );
}

export function CaseColorPalette({
  activeToken,
  disabled = false,
  onSelectToken,
}: CaseColorPaletteProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 ">
      {CASE_COMPOSER_COLOR_OPTIONS.map((option) => {
        const isActive = option.token === activeToken;

        return (
          <button
            aria-label={option.label}
            aria-pressed={isActive}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-150",
              option.token === "default"
                ? "border-border/80 bg-card text-foreground"
                : "border-white/60 shadow-inner",
              isActive
                ? "ring-1 ring-[color:var(--color-muted)] ring-offset-2 ring-offset-card"
                : "hover:scale-[1.04]",
              disabled && "cursor-not-allowed opacity-50",
            )}
            data-testid={`case-composer-toolbar-color-option-${option.token}`}
            disabled={disabled}
            key={option.token}
            onClick={() => {
              onSelectToken?.(option.token);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            style={{
              background: option.swatch,
            }}
            type="button"
          >
            {option.token === "default" ? "Aa" : null}
          </button>
        );
      })}
    </div>
  );
}
