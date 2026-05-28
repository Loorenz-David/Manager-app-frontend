import { getCountryCallingCode } from './metadata';
import { getCountryFlagEmoji } from './flag';
import type { CountryIso2, PhoneCountry } from '@beyo/lib';

export const DEFAULT_PHONE_COUNTRY_ISO2: CountryIso2 = 'SE';

const COUNTRY_NAMES = {
  AR: 'Argentina',
  AT: 'Austria',
  AU: 'Australia',
  BE: 'Belgium',
  BG: 'Bulgaria',
  BR: 'Brazil',
  CA: 'Canada',
  CH: 'Switzerland',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GB: 'United Kingdom',
  GR: 'Greece',
  HK: 'Hong Kong',
  HR: 'Croatia',
  HU: 'Hungary',
  IE: 'Ireland',
  IN: 'India',
  IS: 'Iceland',
  IT: 'Italy',
  JP: 'Japan',
  KR: 'South Korea',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  MX: 'Mexico',
  MY: 'Malaysia',
  NL: 'Netherlands',
  NO: 'Norway',
  NZ: 'New Zealand',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SA: 'Saudi Arabia',
  SE: 'Sweden',
  SG: 'Singapore',
  SI: 'Slovenia',
  SK: 'Slovakia',
  TH: 'Thailand',
  US: 'United States',
  ZA: 'South Africa',
} as const satisfies Partial<Record<CountryIso2, string>>;

const COUNTRY_ORDER = [
  'SE',
  'US',
  'GB',
  'DK',
  'NO',
  'FI',
  'DE',
  'FR',
  'ES',
  'IT',
  'NL',
  'BE',
  'CH',
  'AT',
  'IE',
  'PL',
  'PT',
  'CZ',
  'SK',
  'HU',
  'RO',
  'BG',
  'HR',
  'SI',
  'EE',
  'LV',
  'LT',
  'IS',
  'LU',
  'CA',
  'MX',
  'BR',
  'AR',
  'CL',
  'CO',
  'AU',
  'NZ',
  'JP',
  'KR',
  'CN',
  'HK',
  'IN',
  'SG',
  'MY',
  'TH',
  'SA',
  'ZA',
] as const satisfies readonly CountryIso2[];

export const PHONE_COUNTRIES: PhoneCountry[] = COUNTRY_ORDER.map((iso2) => ({
  iso2,
  name: COUNTRY_NAMES[iso2],
  dialCode: getCountryCallingCode(iso2),
  prefix: `+${getCountryCallingCode(iso2)}`,
  flagEmoji: getCountryFlagEmoji(iso2),
}));

const PHONE_COUNTRY_MAP = new Map(
  PHONE_COUNTRIES.map((country) => [country.iso2, country] as const),
);

export function getPhoneCountryByIso2(iso2: CountryIso2 | null | undefined): PhoneCountry | null {
  if (!iso2) {
    return null;
  }

  return PHONE_COUNTRY_MAP.get(iso2) ?? null;
}
