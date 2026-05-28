import { ImageIcon } from "lucide-react";

import { cn } from '@beyo/lib';

export type ImagePlaceholderProps = {
  className?: string;
  iconClassName?: string;
};

export function ImagePlaceholder({
  className,
  iconClassName,
}: ImagePlaceholderProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center bg-[color:var(--color-light-border)]",
        className,
      )}
    >
      <ImageIcon
        className={cn(
          "size-5 text-[color:var(--color-muted-foreground)]/40",
          iconClassName,
        )}
      />
    </div>
  );
}
