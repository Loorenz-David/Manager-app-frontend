import type { CountryIso2 } from '@/types/phone';

export function getCountryFlagEmoji(iso2: CountryIso2): string {
  const upper = iso2.toUpperCase();

  if (!/^[A-Z]{2}$/.test(upper)) {
    return upper;
  }

  return String.fromCodePoint(
    ...upper.split('').map((char) => 127397 + char.charCodeAt(0)),
  );
}
