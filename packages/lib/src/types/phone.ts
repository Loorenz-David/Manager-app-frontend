import type { CountryCode } from 'libphonenumber-js/min';

export type CountryIso2 = CountryCode;

export type PhoneCountry = {
  iso2: CountryIso2;
  name: string;
  dialCode: string;
  prefix: string;
  flagEmoji: string;
};

export type PhoneInputResolution = {
  country: PhoneCountry | null;
  countryIso2: CountryIso2 | null;
  displayValue: string;
  normalizedValue: string;
  isPossible: boolean;
  isValid: boolean;
  hasNormalizedValue: boolean;
};

export type ManagedPhoneInputChangeMeta = PhoneInputResolution & {
  rawValue: string;
};
