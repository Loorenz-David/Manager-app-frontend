import { useFormContext } from 'react-hook-form';

import { TextInput } from '@/components/primitives';

/**
 * Parent forms must initialize `customer.address` as an object with empty
 * string fields, not `null`, so RHF can bind nested address paths on mount.
 */
export function CustomerAddressFieldGroup() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const addressErrors = (
    errors as {
      customer?: { address?: Record<string, { message?: string }> };
    }
  ).customer?.address;

  return (
    <div className="flex flex-col gap-3" data-testid="customer-address-field-group">
      <p className="text-sm font-medium text-foreground">
        Address <span className="font-normal text-muted-foreground">(optional)</span>
      </p>
      <TextInput
        data-testid="customer-address-street-input"
        id="customer-address-street"
        type="text"
        autoComplete="street-address"
        placeholder="Street"
        invalid={Boolean(addressErrors?.street?.message)}
        {...register('customer.address.street')}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          data-testid="customer-address-city-input"
          id="customer-address-city"
          type="text"
          autoComplete="address-level2"
          placeholder="City"
          invalid={Boolean(addressErrors?.city?.message)}
          {...register('customer.address.city')}
        />
        <TextInput
          data-testid="customer-address-postal-code-input"
          id="customer-address-postal"
          type="text"
          autoComplete="postal-code"
          placeholder="Postal code"
          invalid={Boolean(addressErrors?.postal_code?.message)}
          {...register('customer.address.postal_code')}
        />
      </div>
      <TextInput
        data-testid="customer-address-country-input"
        id="customer-address-country"
        type="text"
        autoComplete="country-name"
        placeholder="Country"
        invalid={Boolean(addressErrors?.country?.message)}
        {...register('customer.address.country')}
      />
    </div>
  );
}
