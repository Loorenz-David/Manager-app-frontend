import { cn } from "@/lib/utils";

export type DashedInfoSectionProps = {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function DashedInfoSection({
  children,
  className,
  "data-testid": testId,
}: DashedInfoSectionProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 px-4 py-4",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
