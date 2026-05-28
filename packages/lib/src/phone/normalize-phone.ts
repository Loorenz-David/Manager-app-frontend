import { getPhoneCountryByIso2 } from './countries';
import { formatPhoneDisplay, sanitizePhoneDraft } from './format-phone-display';
import { parsePhoneNumberFromString } from './metadata';
import type { CountryIso2, PhoneInputResolution } from '@beyo/lib';

export function normalizePhoneDraft(
  raw: string,
  countryIso2: CountryIso2 | null,
): PhoneInputResolution {
  const sanitized = sanitizePhoneDraft(raw);

  if (!sanitized) {
    return {
      country: getPhoneCountryByIso2(countryIso2),
      countryIso2,
      displayValue: '',
      normalizedValue: '',
      isPossible: false,
      isValid: false,
      hasNormalizedValue: false,
    };
  }

  const parsed = sanitized.startsWith('+')
    ? parsePhoneNumberFromString(sanitized)
    : parsePhoneNumberFromString(sanitized, countryIso2 ?? undefined);

  const resolvedIso2 = (parsed?.country ?? countryIso2 ?? null) as CountryIso2 | null;
  const displayValue =
    sanitized.startsWith('+') && parsed?.country && parsed.isValid()
      ? parsed.formatNational()
      : formatPhoneDisplay(sanitized, countryIso2);

  return {
    country: getPhoneCountryByIso2(resolvedIso2),
    countryIso2: resolvedIso2,
    displayValue,
    normalizedValue: parsed?.number ?? '',
    isPossible: parsed?.isPossible() ?? false,
    isValid: parsed?.isValid() ?? false,
    hasNormalizedValue: Boolean(parsed?.number),
  };
}
