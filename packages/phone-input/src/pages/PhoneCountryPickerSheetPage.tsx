import { Check } from "lucide-react";

import { PHONE_COUNTRIES, cn, type CountryIso2 } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { PhoneCountryPickerSurfaceProps } from "@beyo/ui";

export function PhoneCountryPickerSheetPage(): React.JSX.Element {
  const { currentCountryIso2, onSelect } =
    useSurfaceProps<PhoneCountryPickerSurfaceProps>();
  const header = useSurfaceHeader();

  function handleSelect(countryIso2: CountryIso2): void {
    onSelect?.(countryIso2);
    header?.requestClose();
  }

  return (
    <div className="flex flex-col" data-testid="phone-country-picker-sheet">
      <div className="px-4 pb-3 pt-4">
        <p className="text-base font-semibold text-foreground">Select country</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a country and prefix for local phone formatting.
        </p>
      </div>
      <div className="flex flex-col pb-[var(--safe-bottom)]">
        {PHONE_COUNTRIES.map((country) => {
          const isSelected = country.iso2 === currentCountryIso2;

          return (
            <button
              key={country.iso2}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-3 border-t border-border px-4 py-3 text-left transition",
                isSelected && "bg-muted/35",
              )}
              data-testid={`phone-country-${country.iso2.toLowerCase()}-option`}
              type="button"
              onClick={() => handleSelect(country.iso2)}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {country.flagEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {country.name}
                </p>
                <p className="text-xs text-muted-foreground">{country.prefix}</p>
              </div>
              {isSelected ? <Check className="size-4 text-primary" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
