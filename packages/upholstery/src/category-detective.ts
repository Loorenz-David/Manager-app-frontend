import { fetchExternalUpholsteryOptions } from "./api/fetch-external-upholstery-options";
import {
  type ExternalUpholsteryProvider,
  type UpholsteryPickerOption,
  type UpholsteryPickerRecord,
  isExternalUpholsteryOrigin,
} from "./types";

const MIN_EVIDENCE_COUNT = 2;

function normalizeWords(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

export function deriveItemCategoryName(name: string): string | null {
  const words = normalizeWords(name);
  const firstNumericIndex = words.findIndex((word) => /^\d/.test(word));

  return firstNumericIndex > 0
    ? words.slice(0, firstNumericIndex).join(" ")
    : null;
}

function getEvidenceQuery(record: UpholsteryPickerRecord): string {
  const fastCategory = deriveItemCategoryName(record.name);

  if (fastCategory) {
    return fastCategory;
  }

  return normalizeWords(record.name).slice(0, 2).join(" ") || record.name;
}

function deriveRepeatedPrefix(
  target: UpholsteryPickerRecord,
  evidence: UpholsteryPickerOption[],
): string | null {
  const targetWords = normalizeWords(target.name);
  const comparableNames = evidence
    .filter((item) => item.name.trim() !== target.name.trim())
    .map((item) => normalizeWords(item.name));

  if (targetWords.length < 2 || comparableNames.length < MIN_EVIDENCE_COUNT) {
    return null;
  }

  let prefixLength = 0;

  for (let index = 0; index < targetWords.length - 1; index += 1) {
    const candidate = targetWords[index]?.toLowerCase();

    if (!candidate) {
      break;
    }

    const matches = comparableNames.filter(
      (words) => words[index]?.toLowerCase() === candidate,
    );

    if (matches.length < MIN_EVIDENCE_COUNT) {
      break;
    }

    prefixLength = index + 1;
  }

  return prefixLength > 0
    ? targetWords.slice(0, prefixLength).join(" ")
    : null;
}

export async function detectExternalItemCategoryName(
  record: UpholsteryPickerRecord,
): Promise<string | null> {
  const localCategory = deriveItemCategoryName(record.name);

  if (localCategory || !isExternalUpholsteryOrigin(record.origin)) {
    return localCategory;
  }

  const provider: ExternalUpholsteryProvider = record.origin;

  try {
    const evidence = await fetchExternalUpholsteryOptions({
      q: getEvidenceQuery(record),
      limit: 12,
      providers: [provider],
    });

    return deriveRepeatedPrefix(record, evidence.upholsteries);
  } catch (error) {
    console.error("Failed to detect external upholstery category", error);
    return null;
  }
}
