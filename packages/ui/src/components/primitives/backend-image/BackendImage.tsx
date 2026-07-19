import { useEffect, useState } from "react";
import type { ImgHTMLAttributes, ReactNode } from "react";

import { cn } from "@beyo/lib";

import { ImagePlaceholder } from "../image-placeholder";

export type BackendImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  /** Backend image URL. May be null/undefined while data loads or when absent. */
  src: string | null | undefined;
  /**
   * Rendered when `src` is missing or the image fails to load.
   * Defaults to a muted `<ImagePlaceholder />`.
   */
  fallback?: ReactNode;
};

/**
 * Centralized renderer for images whose URL comes from the backend.
 *
 * Backend GET URLs are already byte-stable within their signing bucket (see the backend
 * `stable_presign` deterministic signer), so this component does not stabilize URLs — it
 * owns the two remaining render concerns:
 *
 * 1. **Fallback** — a missing `src` or a load failure (network blip, expired-on-idle URL,
 *    genuinely absent image) renders `fallback` instead of the browser's broken-image glyph.
 * 2. **Swap-on-decode** — when `src` changes to a genuinely new image (e.g. the ~6h bucket
 *    rollover or a replaced upload), the previous image stays on screen until the new one has
 *    decoded, so there is no blank frame / flicker during the swap.
 *
 * All other `<img>` attributes pass through; `alt`, `loading`, `decoding`, and `draggable`
 * have sensible defaults that callers may override.
 */
export function BackendImage({
  src,
  fallback,
  alt = "",
  loading = "lazy",
  decoding = "async",
  draggable = false,
  onLoad,
  onError,
  ...imgProps
}: BackendImageProps): React.JSX.Element {
  // The URL currently painted. Lags `src` during a swap so the old image stays visible
  // until the incoming one is decoded.
  const [displayedSrc, setDisplayedSrc] = useState<string | null | undefined>(src);
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    if (!src) {
      setDisplayedSrc(src);
      setDidFail(false);
      return;
    }

    if (src === displayedSrc) {
      return;
    }

    let cancelled = false;

    // First image (nothing shown yet): let the <img> load it directly so native `loading`
    // and the browser cache apply, and errors surface through the element's onError.
    if (!displayedSrc) {
      setDidFail(false);
      setDisplayedSrc(src);
      return;
    }

    // Swap: preload+decode off-screen, then swap the visible src only once it is paintable.
    const preload = new Image();

    const commit = () => {
      if (cancelled) return;
      setDidFail(false);
      setDisplayedSrc(src);
    };
    const fail = () => {
      if (cancelled) return;
      setDidFail(true);
    };

    preload.onload = commit;
    preload.onerror = fail;
    preload.src = src;

    // Prefer decode() when available: it resolves only once the image is paintable, so the
    // swap never lands on a half-decoded frame. Where it is unavailable (e.g. jsdom) the
    // onload/onerror handlers above are the fallback.
    if (typeof preload.decode === "function") {
      preload.decode().then(commit).catch(() => {
        // decode() may reject even when the image is fine (e.g. detached element in some
        // browsers); defer to the load/error events rather than failing outright.
      });
    }

    return () => {
      cancelled = true;
    };
    // displayedSrc intentionally omitted: this effect reacts to incoming `src` changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const showImage = Boolean(displayedSrc) && !didFail;

  if (!showImage) {
    return <>{fallback ?? <ImagePlaceholder />}</>;
  }

  return (
    <img
      {...imgProps}
      alt={alt}
      className={cn(imgProps.className)}
      decoding={decoding}
      draggable={draggable}
      loading={loading}
      src={displayedSrc ?? undefined}
      onError={(event) => {
        setDidFail(true);
        onError?.(event);
      }}
      onLoad={onLoad}
    />
  );
}
