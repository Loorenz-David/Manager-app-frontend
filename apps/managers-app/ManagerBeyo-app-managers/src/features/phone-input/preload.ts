const preloadedPhoneInputSurfaces = new Set<string>();

function loadPhoneCountryPickerSheetPage() {
  return import('@/features/phone-input/pages/PhoneCountryPickerSheetPage').then((module) => ({
    default: module.PhoneCountryPickerSheetPage,
  }));
}

export function preloadPhoneCountryPickerSurface(): Promise<unknown> {
  if (preloadedPhoneInputSurfaces.has('phone-country-picker')) {
    return Promise.resolve();
  }

  preloadedPhoneInputSurfaces.add('phone-country-picker');
  return loadPhoneCountryPickerSheetPage();
}

export { loadPhoneCountryPickerSheetPage };
