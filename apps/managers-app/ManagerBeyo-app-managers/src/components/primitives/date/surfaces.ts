import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

const preloadedCalendarSurfaces = new Set<string>();

function loadCalendarSinglePickerPage() {
  return import('@/pages/calendar/CalendarSinglePickerPage').then((module) => ({
    default: module.CalendarSinglePickerPage,
  }));
}

function loadCalendarRangePickerPage() {
  return import('@/pages/calendar/CalendarRangePickerPage').then((module) => ({
    default: module.CalendarRangePickerPage,
  }));
}

export function preloadCalendarSinglePickerSurface(): Promise<unknown> {
  if (preloadedCalendarSurfaces.has('calendar-single-picker')) {
    return Promise.resolve();
  }

  preloadedCalendarSurfaces.add('calendar-single-picker');
  return loadCalendarSinglePickerPage();
}

export function preloadCalendarRangePickerSurface(): Promise<unknown> {
  if (preloadedCalendarSurfaces.has('calendar-range-picker')) {
    return Promise.resolve();
  }

  preloadedCalendarSurfaces.add('calendar-range-picker');
  return loadCalendarRangePickerPage();
}

export function preloadCalendarSurfaces(): Promise<unknown[]> {
  return Promise.all([
    preloadCalendarSinglePickerSurface(),
    preloadCalendarRangePickerSurface(),
  ]);
}

export const calendarSurfaces: SurfaceRegistrations = {
  'calendar-single-picker': {
    surface: 'sheet',
    component: lazy(loadCalendarSinglePickerPage),
  },
  'calendar-range-picker': {
    surface: 'sheet',
    component: lazy(loadCalendarRangePickerPage),
  },
};
