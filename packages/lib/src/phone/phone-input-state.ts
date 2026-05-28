import { DEFAULT_PHONE_COUNTRY_ISO2, getPhoneCountryByIso2 } from './countries';
import { parseE164Value } from './parse-e164';
import { normalizePhoneDraft } from './normalize-phone';
import type {
  CountryIso2,
  ManagedPhoneInputChangeMeta,
  PhoneInputResolution,
} from '@beyo/lib';

type ResolveInitialPhoneStateArgs = {
  value?: string;
  controlledCountryIso2?: CountryIso2;
  persistedCountryIso2?: CountryIso2 | null;
};

export function resolveInitialPhoneState({
  value,
  controlledCountryIso2,
  persistedCountryIso2,
}: ResolveInitialPhoneStateArgs): PhoneInputResolution {
  const parsedValue = parseE164Value(value);

  if (parsedValue) {
    return parsedValue;
  }

  const countryIso2 =
    controlledCountryIso2 ??
    persistedCountryIso2 ??
    DEFAULT_PHONE_COUNTRY_ISO2;

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

export function resolvePhoneChange(
  rawValue: string,
  countryIso2: CountryIso2 | null,
): ManagedPhoneInputChangeMeta {
  const resolution = normalizePhoneDraft(rawValue, countryIso2);

  return {
    ...resolution,
    rawValue,
  };
}
