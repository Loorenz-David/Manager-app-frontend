import { cn } from "@/lib/utils";

export type DashedInfoSectionProps = {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function DashedInfoSection({
  children,
  className = "px-4 py-4",
  "data-testid": testId,
}: DashedInfoSectionProps): React.JSX.Element {
  return (
    <div
      className={cn("flex w-full flex-col gap-2", className)}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
