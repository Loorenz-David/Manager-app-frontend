import { z } from 'zod';

import { getPhoneCountryByIso2 } from './countries';
import type { CountryIso2 } from '@/types/phone';

export const LAST_PHONE_COUNTRY_STORAGE_KEY = 'managerbeyo.phone-input.last-country.v1';

const LastPhoneCountrySchema = z.object({
  iso2: z.string().length(2),
  updatedAt: z.number().int(),
});

export function readLastPhoneCountryIso2(): CountryIso2 | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(LAST_PHONE_COUNTRY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const parsed = LastPhoneCountrySchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return null;
  }

  const iso2 = parsed.data.iso2.toUpperCase() as CountryIso2;
  return getPhoneCountryByIso2(iso2)?.iso2 ?? null;
}

export function writeLastPhoneCountryIso2(iso2: CountryIso2): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LAST_PHONE_COUNTRY_STORAGE_KEY,
    JSON.stringify({
      iso2,
      updatedAt: Date.now(),
    }),
  );
}
