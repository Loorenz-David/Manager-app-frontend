import { AsYouType } from './metadata';
import type { CountryIso2 } from '@beyo/lib';

export function sanitizePhoneDraft(raw: string): string {
  return raw
    .replace(/[^\d+\s\-().]/g, '')
    .replace(/(?!^)\+/g, '');
}

export function formatPhoneDisplay(raw: string, countryIso2: CountryIso2 | null): string {
  const sanitized = sanitizePhoneDraft(raw);

  if (!sanitized) {
    return '';
  }

  const formatter = new AsYouType(countryIso2 ?? undefined);
  const formatted = formatter.input(sanitized);

  return formatted || sanitized;
}
