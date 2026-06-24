import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

export const PHONE_COUNTRY_PICKER_SURFACE_ID = "phone-country-picker";

function loadPhoneCountryPickerSheetPage() {
  return import("./pages/PhoneCountryPickerSheetPage").then((module) => ({
    default: module.PhoneCountryPickerSheetPage,
  }));
}

const phoneCountryPicker = lazyWithPreload(loadPhoneCountryPickerSheetPage);

export const preloadPhoneCountryPickerSurface = phoneCountryPicker.preload;

export const phoneInputSurfaces: SurfaceRegistrations = {
  [PHONE_COUNTRY_PICKER_SURFACE_ID]: {
    surface: "sheet",
    component: phoneCountryPicker.Component,
  },
};
