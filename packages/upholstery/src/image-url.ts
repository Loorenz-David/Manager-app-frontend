const NEVOTEX_ORIGIN = "https://nevotex.se";
const NEVOTEX_IMAGE_PATH_PREFIX = "/Files/Images/";
const NEVOTEX_THUMBNAIL_PATH = "/Admin/Public/GetImage.ashx";

/**
 * Suppliers on Bunny CDN (`<zone>.b-cdn.net`) serve their source images
 * unscaled — one measured case decoded a 2600x2600 original into a 112px
 * card thumbnail, 23x more pixels than the box ever painted. Bunny's Image
 * Optimizer reads plain query params on the same URL; if the zone doesn't
 * have it enabled the params are just ignored and the original is served,
 * so this is a no-op fallback rather than a broken image on zones without it.
 */
const BUNNY_CDN_HOST_SUFFIX = ".b-cdn.net";

type UpholsteryThumbnailOptions = {
  width: number;
  height: number;
  compression?: number;
  crop?: number;
  fillCanvas?: boolean;
};

function extractNevotexImagePath(imageUrl: string): string | null {
  try {
    const url = imageUrl.startsWith("http")
      ? new URL(imageUrl)
      : new URL(imageUrl, NEVOTEX_ORIGIN);

    if (url.pathname === NEVOTEX_THUMBNAIL_PATH) {
      const nestedImagePath = url.searchParams.get("image");
      return nestedImagePath?.startsWith(NEVOTEX_IMAGE_PATH_PREFIX)
        ? nestedImagePath
        : null;
    }

    if (
      url.origin === NEVOTEX_ORIGIN &&
      url.pathname.startsWith(NEVOTEX_IMAGE_PATH_PREFIX)
    ) {
      return url.pathname;
    }
  } catch {
    return imageUrl.startsWith(NEVOTEX_IMAGE_PATH_PREFIX) ? imageUrl : null;
  }

  return null;
}

function resizeIfBunnyCdn(
  imageUrl: string,
  width: number,
  height: number,
  quality: number,
): string | null {
  try {
    const url = new URL(imageUrl);
    if (!url.hostname.endsWith(BUNNY_CDN_HOST_SUFFIX)) {
      return null;
    }

    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    url.searchParams.set("aspect_ratio", "force");
    url.searchParams.set("quality", String(quality));
    return url.toString();
  } catch {
    return null;
  }
}

export function getUpholsteryImageUrl(
  imageUrl: string | null | undefined,
  {
    width,
    height,
    compression = 75,
    crop = 5,
    fillCanvas = true,
  }: UpholsteryThumbnailOptions,
): string | null {
  if (!imageUrl) {
    return null;
  }

  const nevotexImagePath = extractNevotexImagePath(imageUrl);

  if (nevotexImagePath) {
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      crop: String(crop),
      FillCanvas: String(fillCanvas),
      Compression: String(compression),
      image: nevotexImagePath,
    });

    return `${NEVOTEX_ORIGIN}${NEVOTEX_THUMBNAIL_PATH}?${params.toString()}`;
  }

  return resizeIfBunnyCdn(imageUrl, width, height, compression) ?? imageUrl;
}
