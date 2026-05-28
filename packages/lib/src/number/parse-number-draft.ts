import { sanitizeNumberInput } from './sanitize-number-input';

type ParseNumberDraftOptions = {
  allowDecimal?: boolean;
  allowNegative?: boolean;
};

export type ParsedNumberDraft = {
  draft: string;
  sanitizedDraft: string;
  parsedValue: number | null;
  hasParsedValue: boolean;
  isEmpty: boolean;
  isPartial: boolean;
};

export function parseNumberDraft(
  raw: string,
  { allowDecimal = false, allowNegative = false }: ParseNumberDraftOptions = {},
): ParsedNumberDraft {
  const sanitizedDraft = sanitizeNumberInput(raw, {
    allowDecimal,
    allowNegative,
  });
  const isEmpty = sanitizedDraft.length === 0;
  const isPartial =
    sanitizedDraft === '-' ||
    sanitizedDraft === '.' ||
    sanitizedDraft === '-.' ||
    sanitizedDraft.endsWith('.');

  if (isEmpty || isPartial) {
    return {
      draft: raw,
      sanitizedDraft,
      parsedValue:
        sanitizedDraft !== '.' && sanitizedDraft !== '-' && sanitizedDraft !== '-.'
          ? Number(sanitizedDraft.slice(0, -1))
          : null,
      hasParsedValue:
        sanitizedDraft.endsWith('.') &&
        sanitizedDraft !== '.' &&
        sanitizedDraft !== '-.' &&
        !Number.isNaN(Number(sanitizedDraft.slice(0, -1))),
      isEmpty,
      isPartial: true,
    };
  }

  const parsedValue = Number(sanitizedDraft);
  const hasParsedValue = !Number.isNaN(parsedValue);

  return {
    draft: raw,
    sanitizedDraft,
    parsedValue: hasParsedValue ? parsedValue : null,
    hasParsedValue,
    isEmpty,
    isPartial: false,
  };
}
