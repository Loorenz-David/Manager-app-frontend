import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

function loadPhoneCountryPickerSheetPage() {
  return import("@/features/phone-input/pages/PhoneCountryPickerSheetPage").then(
    (module) => ({
      default: module.PhoneCountryPickerSheetPage,
    }),
  );
}

const phoneCountryPicker = lazyWithPreload(loadPhoneCountryPickerSheetPage);

export const preloadPhoneCountryPickerSurface = phoneCountryPicker.preload;

export const phoneInputSurfaces: SurfaceRegistrations = {
  "phone-country-picker": {
    surface: "sheet",
    component: phoneCountryPicker.Component,
  },
};
