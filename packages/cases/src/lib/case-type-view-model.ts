import type { BoxPickerOptionType } from "@beyo/ui";

import type { CaseType, CaseTypeSelectedDisplay } from "../types";

export function toCaseTypePickerOption(
  caseType: CaseType,
): BoxPickerOptionType<string> {
  return {
    value: caseType.client_id as string,
    label: caseType.name,
    image: caseType.image_url ?? undefined,
    description: caseType.description ?? undefined,
    testId: `case-type-option-${caseType.client_id}`,
  };
}

export function toCaseTypeSelectedDisplay(
  caseType: CaseType,
): CaseTypeSelectedDisplay {
  return {
    clientId: caseType.client_id as string,
    name: caseType.name,
    imageUrl: caseType.image_url ?? null,
    description: caseType.description ?? null,
  };
}
