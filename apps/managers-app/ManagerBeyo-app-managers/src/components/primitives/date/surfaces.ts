import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

function loadCalendarSinglePickerPage() {
  return import("@/pages/calendar/CalendarSinglePickerPage").then((module) => ({
    default: module.CalendarSinglePickerPage,
  }));
}

function loadCalendarRangePickerPage() {
  return import("@/pages/calendar/CalendarRangePickerPage").then((module) => ({
    default: module.CalendarRangePickerPage,
  }));
}

const calendarSinglePicker = lazyWithPreload(loadCalendarSinglePickerPage);
const calendarRangePicker = lazyWithPreload(loadCalendarRangePickerPage);

export const preloadCalendarSinglePickerSurface = calendarSinglePicker.preload;
export const preloadCalendarRangePickerSurface = calendarRangePicker.preload;

export function preloadCalendarSurfaces(): Promise<unknown[]> {
  return Promise.all([
    preloadCalendarSinglePickerSurface(),
    preloadCalendarRangePickerSurface(),
  ]);
}

export const calendarSurfaces: SurfaceRegistrations = {
  "calendar-single-picker": {
    surface: "sheet",
    component: calendarSinglePicker.Component,
  },
  "calendar-range-picker": {
    surface: "sheet",
    component: calendarRangePicker.Component,
  },
};
