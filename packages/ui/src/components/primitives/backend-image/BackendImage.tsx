import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * URLs that have fully decoded once this session. A remounted BackendImage
 * (e.g. a slide-stack pane or list row returning to the screen) skips the
 * skeleton for these and paints straight from the browser cache — without
 * this, every remount replays the shimmer over already-loaded images.
 * FIFO-capped so a very long session cannot grow it unboundedly.
 */
const decodedOnceUrls = new Set<string>();
const DECODED_ONCE_CAP = 1000;

function rememberDecoded(url: string | null | undefined): void {
  if (!url) return;
  if (decodedOnceUrls.size >= DECODED_ONCE_CAP && !decodedOnceUrls.has(url)) {
    const oldest = decodedOnceUrls.values().next().value;
    if (oldest !== undefined) decodedOnceUrls.delete(oldest);
  }
  decodedOnceUrls.add(url);
}

/**
 * Centralized renderer for images whose URL comes from the backend.
 *
 * Backend GET URLs are already byte-stable within their signing bucket (see the backend
 * `stable_presign` deterministic signer), so this component does not stabilize URLs — it
 * owns the three remaining render concerns:
 *
 * 1. **Fallback** — a missing `src` or a load failure (network blip, expired-on-idle URL,
 *    genuinely absent image) renders `fallback` instead of the browser's broken-image glyph.
 * 2. **Skeleton-on-decode** — the first image stays visually hidden behind a shimmer until it
 *    has decoded, preventing progressive images from painting with a dated "scan" effect.
 * 3. **Swap-on-decode** — when `src` changes to a genuinely new image (e.g. the ~6h bucket
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
  // An image that already decoded this session reveals immediately on mount —
  // the bytes are in the browser cache; a skeleton would just flash.
  const [isDisplayedDecoded, setIsDisplayedDecoded] = useState(
    () => Boolean(src && decodedOnceUrls.has(src)),
  );
  const displayedImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
      setDisplayedSrc(src);
      setDidFail(false);
      setIsDisplayedDecoded(false);
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
      setIsDisplayedDecoded(decodedOnceUrls.has(src));
      setDisplayedSrc(src);
      return;
    }

    // Swap: preload+decode off-screen, then swap the visible src only once it is paintable.
    const preload = new Image();

    const commit = () => {
      if (cancelled) return;
      rememberDecoded(src);
      setDidFail(false);
      setIsDisplayedDecoded(true);
      setDisplayedSrc(src);
    };
    const fail = () => {
      if (cancelled) return;
      setDidFail(true);
    };

    // Prefer decode() when available: it resolves only once the image is paintable. `load`
    // alone is not enough because progressive formats can otherwise reveal in visible bands.
    preload.onerror = fail;
    if (typeof preload.decode === "function") {
      let didLoad = false;
      let decodeRejected = false;

      preload.onload = () => {
        didLoad = true;
        // Some browsers reject decode() for detached images even after a successful load.
        if (decodeRejected) commit();
      };
      preload.src = src;
      preload.decode().then(commit).catch(() => {
        decodeRejected = true;
        if (didLoad) commit();
      });
    } else {
      preload.onload = commit;
      preload.src = src;
    }

    return () => {
      cancelled = true;
    };
    // displayedSrc intentionally omitted: this effect reacts to incoming `src` changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Already-cached images: a freshly created <img> whose bytes are in the
  // browser cache is `complete` right away, and may never fire `load` at all.
  // Checking in a layout effect reveals it before the browser paints, so a
  // remount (a slide-stack pane returning, a list row recycling) shows no
  // skeleton. This backs up `decodedOnceUrls`, which only records URLs whose
  // async decode() resolved while still mounted — a pane left quickly, or the
  // short-lived ghost copy rendered during a drag, never gets that far.
  useLayoutEffect(() => {
    if (isDisplayedDecoded || didFail) return;

    const image = displayedImageRef.current;
    if (!image?.complete || image.naturalWidth === 0) return;

    rememberDecoded(displayedSrc);
    setIsDisplayedDecoded(true);
  }, [displayedSrc, isDisplayedDecoded, didFail]);

  const showImage = Boolean(displayedSrc) && !didFail;

  if (!showImage) {
    return <>{fallback ?? <ImagePlaceholder />}</>;
  }

  return (
    <span
      className={cn(
        "relative isolate block overflow-hidden",
        imgProps.className,
      )}
    >
      {!isDisplayedDecoded ? (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          data-backend-image-skeleton=""
        >
          <span className="skeleton-shimmer block size-full" />
        </span>
      ) : null}
      <img
        {...imgProps}
        ref={displayedImageRef}
        alt={alt}
        className={cn("relative size-full", imgProps.className)}
        decoding={decoding}
        draggable={draggable}
        loading={loading}
        src={displayedSrc ?? undefined}
        style={{
          ...imgProps.style,
          opacity: isDisplayedDecoded ? imgProps.style?.opacity : 0,
        }}
        onError={(event) => {
          setDidFail(true);
          setIsDisplayedDecoded(false);
          onError?.(event);
        }}
        onLoad={(event) => {
          onLoad?.(event);

          const image = event.currentTarget;
          if (typeof image.decode !== "function") {
            rememberDecoded(displayedSrc);
            setIsDisplayedDecoded(true);
            return;
          }

          const revealCurrentImage = () => {
            // Ignore a late decode from an image that failed or was replaced in the meantime.
            if (displayedImageRef.current === image) {
              rememberDecoded(displayedSrc);
              setIsDisplayedDecoded(true);
            }
          };

          image.decode().then(revealCurrentImage, () => {
            // A successful load is still safe to reveal when a browser rejects decode() for
            // implementation-specific reasons.
            revealCurrentImage();
          });
        }}
      />
    </span>
  );
}
