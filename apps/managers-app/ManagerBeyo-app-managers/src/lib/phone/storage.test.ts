import { beforeEach, describe, expect, it } from 'vitest';

import {
  LAST_PHONE_COUNTRY_STORAGE_KEY,
  readLastPhoneCountryIso2,
  writeLastPhoneCountryIso2,
} from './storage';

describe('phone storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips the last selected country', () => {
    writeLastPhoneCountryIso2('DK');

    expect(readLastPhoneCountryIso2()).toBe('DK');
  });

  it('ignores malformed local storage payloads', () => {
    window.localStorage.setItem(LAST_PHONE_COUNTRY_STORAGE_KEY, '{bad json');

    expect(readLastPhoneCountryIso2()).toBeNull();
  });
});
