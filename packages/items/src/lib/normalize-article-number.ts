const ARTICLE_NUMBER_MIN_LENGTH = 7;

export function normalizeArticleNumberForLookup(articleNumber: string): string {
  if (!/^\d+$/.test(articleNumber)) {
    return articleNumber;
  }

  if (articleNumber.startsWith("0")) {
    return articleNumber;
  }

  return articleNumber.padStart(ARTICLE_NUMBER_MIN_LENGTH, "0");
}
