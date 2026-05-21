import { describe, expect, it } from 'vitest';

import { resolveInitialPhoneState, resolvePhoneChange } from './phone-input-state';

describe('phone-input-state', () => {
  it('hydrates country and display from an incoming e164 value', () => {
    const state = resolveInitialPhoneState({
      value: '+46737262136',
      controlledCountryIso2: 'US',
      persistedCountryIso2: 'DK',
    });

    expect(state.countryIso2).toBe('SE');
    expect(state.displayValue).toBe('073-726 21 36');
    expect(state.normalizedValue).toBe('+46737262136');
    expect(state.hasNormalizedValue).toBe(true);
  });

  it('uses controlled country ahead of persisted country when no value exists', () => {
    const state = resolveInitialPhoneState({
      value: '',
      controlledCountryIso2: 'US',
      persistedCountryIso2: 'SE',
    });

    expect(state.countryIso2).toBe('US');
    expect(state.displayValue).toBe('');
    expect(state.normalizedValue).toBe('');
  });

  it('normalizes a parseable local swedish number to e164', () => {
    const state = resolvePhoneChange('0737262136', 'SE');

    expect(state.countryIso2).toBe('SE');
    expect(state.displayValue).toBe('073-726 21 36');
    expect(state.normalizedValue).toBe('+46737262136');
    expect(state.hasNormalizedValue).toBe(true);
    expect(state.isPossible).toBe(true);
  });

  it('formats an entered international number as local display once the country is resolved', () => {
    const state = resolvePhoneChange('+46737262136', 'US');

    expect(state.countryIso2).toBe('SE');
    expect(state.displayValue).toBe('073-726 21 36');
    expect(state.normalizedValue).toBe('+46737262136');
    expect(state.hasNormalizedValue).toBe(true);
  });

  it('preserves partial input formatting while the user is still typing', () => {
    const state = resolvePhoneChange('0737', 'SE');

    expect(state.countryIso2).toBe('SE');
    expect(state.displayValue).toBe('073-7');
    expect(state.normalizedValue).toBe('+460737');
    expect(state.hasNormalizedValue).toBe(true);
  });
});
