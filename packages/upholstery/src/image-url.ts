const NEVOTEX_ORIGIN = "https://nevotex.se";
const NEVOTEX_IMAGE_PATH_PREFIX = "/Files/Images/";
const NEVOTEX_THUMBNAIL_PATH = "/Admin/Public/GetImage.ashx";

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

  if (!nevotexImagePath) {
    return imageUrl;
  }

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
