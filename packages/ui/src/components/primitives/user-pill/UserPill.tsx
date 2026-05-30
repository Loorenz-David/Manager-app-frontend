import { useEffect, useState } from "react";

import { cn } from "@beyo/lib";

import { ImagePlaceholder } from "../image-placeholder";

export type UserPillProps = {
  userName: string;
  imageSrc?: string | null;
  imageAlt?: string;
  className?: string;
  avatarClassName?: string;
  userNameClassName?: string;
  "data-testid"?: string;
};

export function UserPill({
  userName,
  imageSrc,
  imageAlt,
  className,
  avatarClassName,
  userNameClassName,
  "data-testid": dataTestId,
}: UserPillProps): React.JSX.Element {
  const [didImageFail, setDidImageFail] = useState(false);

  useEffect(() => {
    setDidImageFail(false);
  }, [imageSrc]);

  const showImage = Boolean(imageSrc) && !didImageFail;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--color-soft-container)] px-2.5 py-1 text-sm font-medium text-foreground",
        className,
      )}
      data-testid={dataTestId}
    >
      <span
        className={cn(
          "inline-flex size-[1.75em] shrink-0 items-center justify-center overflow-hidden rounded-full",
          avatarClassName,
        )}
      >
        {showImage ? (
          <img
            src={imageSrc ?? undefined}
            alt={imageAlt ?? userName}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setDidImageFail(true)}
          />
        ) : (
          <ImagePlaceholder
            className="rounded-full"
            iconClassName="size-[0.95em]"
          />
        )}
      </span>
      <span className={cn("truncate leading-none", userNameClassName)}>
        {userName}
      </span>
    </span>
  );
}
