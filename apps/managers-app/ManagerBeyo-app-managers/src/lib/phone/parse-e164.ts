import { getPhoneCountryByIso2 } from './countries';
import { parsePhoneNumberFromString } from './metadata';
import type { CountryIso2, PhoneInputResolution } from '@/types/phone';

export function parseE164Value(value: string | null | undefined): PhoneInputResolution | null {
  if (!value) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(value);
  if (!parsed) {
    return null;
  }

  const countryIso2 = (parsed.country ?? null) as CountryIso2 | null;

  return {
    country: getPhoneCountryByIso2(countryIso2),
    countryIso2,
    displayValue: parsed.formatNational(),
    normalizedValue: parsed.number,
    isPossible: parsed.isPossible(),
    isValid: parsed.isValid(),
    hasNormalizedValue: true,
  };
}
