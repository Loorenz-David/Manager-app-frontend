import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { CountryFlag } from './CountryFlag';
import { countryPrefixSelectorVariants } from './phone-input.variants';
import type { CountryPrefixSelectorProps } from './types';

export function CountryPrefixSelector({
  country,
  disabled = false,
  ariaLabel,
  testId,
  onPress,
}: CountryPrefixSelectorProps): React.JSX.Element {
  return (
    <button
      aria-haspopup="dialog"
      aria-label={ariaLabel ?? 'Select country prefix'}
      className={cn(countryPrefixSelectorVariants())}
      data-testid={testId}
      disabled={disabled}
      type="button"
      onClick={onPress}
    >
      <CountryFlag country={country} className="text-lg leading-none" />
      <span className="font-medium">{country?.prefix ?? '—'}</span>
      <ChevronDown className="size-4 text-icon" />
    </button>
  );
}
