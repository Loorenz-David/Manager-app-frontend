import type { PhoneCountry } from '@beyo/lib';

type CountryFlagProps = {
  country: PhoneCountry | null;
  className?: string;
};

export function CountryFlag({ country, className }: CountryFlagProps): React.JSX.Element {
  return (
    <span aria-hidden="true" className={className}>
      {country?.flagEmoji ?? '🌐'}
    </span>
  );
}
