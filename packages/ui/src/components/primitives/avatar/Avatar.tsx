import { useEffect, useMemo, useState } from "react";

import { cn } from "@beyo/lib";

import { ImagePlaceholder } from "../image-placeholder";

function getInitials(name: string): string | null {
  const tokens = name
    .trim()
    .split(/[\s#_-]+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0))
    .join("")
    .toUpperCase();
}

export type AvatarProps = {
  name: string;
  imageSrc?: string | null;
  imageAlt?: string;
  className?: string;
  "data-testid"?: string;
};

export function Avatar({
  name,
  imageSrc,
  imageAlt,
  className,
  "data-testid": testId,
}: AvatarProps): React.JSX.Element {
  const [didImageFail, setDidImageFail] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);

  useEffect(() => {
    setDidImageFail(false);
  }, [imageSrc]);

  const showImage = Boolean(imageSrc) && !didImageFail;

  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        className,
      )}
      data-testid={testId}
    >
      {showImage ? (
        <img
          alt={imageAlt ?? name}
          className="size-full object-cover"
          loading="lazy"
          src={imageSrc ?? undefined}
          onError={() => setDidImageFail(true)}
        />
      ) : initials ? (
        <span className="text-center font-semibold text-muted-foreground">
          {initials}
        </span>
      ) : (
        <ImagePlaceholder className="rounded-full" />
      )}
    </span>
  );
}
