export const CASE_COMPOSER_MODE_STORAGE_KEY =
  "managerbeyo.cases.composerMode";

export const CASE_COMPOSER_MODE_VALUES = ["basic", "rich"] as const;

export type CaseComposerMode = (typeof CASE_COMPOSER_MODE_VALUES)[number];

export const CASE_COMPOSER_MODE: CaseComposerMode = "rich";

function isCaseComposerMode(value: string | null): value is CaseComposerMode {
  return (
    value !== null &&
    CASE_COMPOSER_MODE_VALUES.includes(value as CaseComposerMode)
  );
}

export function resolveCaseComposerMode(): CaseComposerMode {
  if (typeof window === "undefined") {
    return CASE_COMPOSER_MODE;
  }

  const override = window.localStorage.getItem(CASE_COMPOSER_MODE_STORAGE_KEY);

  return isCaseComposerMode(override) ? override : CASE_COMPOSER_MODE;
}
