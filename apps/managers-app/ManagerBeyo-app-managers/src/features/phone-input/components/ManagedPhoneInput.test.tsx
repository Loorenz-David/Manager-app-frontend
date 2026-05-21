import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SurfaceProvider, useSurfaceStore } from '@/providers/SurfaceProvider';
import { LAST_PHONE_COUNTRY_STORAGE_KEY } from '@/lib/phone/storage';

import { ManagedPhoneInput } from './ManagedPhoneInput';

vi.mock('@/features/phone-input/preload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/phone-input/preload')>();

  return {
    ...actual,
    preloadPhoneCountryPickerSurface: () => Promise.resolve(),
  };
});

function renderManagedPhoneInput(
  props: Partial<React.ComponentProps<typeof ManagedPhoneInput>> = {},
) {
  return render(
    <MemoryRouter>
      <SurfaceProvider>
        <ManagedPhoneInput inputTestId="phone-input" selectorTestId="phone-selector" {...props} />
      </SurfaceProvider>
    </MemoryRouter>,
  );
}

describe('ManagedPhoneInput', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSurfaceStore.getState().closeAll();
  });

  it('hydrates selector and visible display from a controlled e164 value', () => {
    renderManagedPhoneInput({ value: '+46737262136' });

    expect(screen.getByTestId('phone-selector')).toHaveTextContent('+46');
    expect(screen.getByTestId('phone-input')).toHaveValue('073-726 21 36');
  });

  it('persists the selected country and reuses it as the empty-state default', async () => {
    const user = userEvent.setup();
    const { unmount } = renderManagedPhoneInput();

    await user.click(screen.getByTestId('phone-selector'));
    await user.click(await screen.findByTestId('phone-country-dk-option'));

    await waitFor(() => {
      expect(screen.getByTestId('phone-selector')).toHaveTextContent('+45');
    });

    expect(window.localStorage.getItem(LAST_PHONE_COUNTRY_STORAGE_KEY)).toContain('"DK"');

    unmount();
    renderManagedPhoneInput();

    expect(screen.getByTestId('phone-selector')).toHaveTextContent('+45');
  });

  it('emits normalized e164 values while preserving local-number editing', async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();

    renderManagedPhoneInput({
      countryIso2: 'SE',
      onValueChange: handleValueChange,
    });

    await user.type(screen.getByTestId('phone-input'), '0737262136');

    expect(screen.getByTestId('phone-input')).toHaveValue('073-726 21 36');
    expect(handleValueChange).toHaveBeenLastCalledWith(
      '+46737262136',
      expect.objectContaining({
        countryIso2: 'SE',
        displayValue: '073-726 21 36',
        normalizedValue: '+46737262136',
      }),
    );
  });

  it('converts a typed international number into the resolved local display format', async () => {
    const user = userEvent.setup();

    renderManagedPhoneInput({
      countryIso2: 'US',
    });

    await user.type(screen.getByTestId('phone-input'), '+46737262136');

    expect(screen.getByTestId('phone-selector')).toHaveTextContent('+46');
    expect(screen.getByTestId('phone-input')).toHaveValue('073-726 21 36');
  });
});
