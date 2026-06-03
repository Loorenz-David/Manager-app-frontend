import { cn } from "@beyo/lib";

export type StatePillVariant =
  | "neutral"
  | "active"
  | "warning"
  | "success"
  | "danger";

const VARIANT_CLASS: Record<StatePillVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  active: "border border-[#b8d9ff] bg-[#eaf4ff] text-[#1f5ea8]",
  warning: "border border-[#f0c36a] bg-[#fff4d6] text-[#8a5a00]",
  success: "border border-[#9ed9b5] bg-[#eaf8ef] text-[#1e7a46]",
  danger: "border border-[#ecb0aa] bg-[#fdecea] text-[#b9382a]",
};

const TEXT_VARIANT_CLASS: Record<StatePillVariant, string> = {
  neutral: "text-muted-foreground",
  active: "text-[#1f5ea8]",
  warning: "text-[#8a5a00]",
  success: "text-[#1e7a46]",
  danger: "text-[#b9382a]",
};

export type StatePillStyle = "pill" | "text";

export type StatePillProps = {
  label: string;
  variant: StatePillVariant;
  style?: StatePillStyle;
  className?: string;
};

export function StatePill({
  label,
  variant,
  style = "pill",
  className,
}: StatePillProps): React.JSX.Element {
  const baseClass =
    style === "text"
      ? "inline text-xs font-medium"
      : "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const variantClass =
    style === "text" ? TEXT_VARIANT_CLASS[variant] : VARIANT_CLASS[variant];

  return (
    <span className={cn(baseClass, variantClass, className)}>{label}</span>
  );
}
