import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

const preloadedItemSurfaces = new Set<string>();

function loadItemCategoryPickerSheetPage() {
  return import('@/features/items/pages/ItemCategoryPickerSheetPage').then((module) => ({
    default: module.ItemCategoryPickerSheetPage,
  }));
}

function loadItemIssueSeverityPickerSheetPage() {
  return import('@/features/items/pages/ItemIssueSeverityPickerSheetPage').then((module) => ({
    default: module.ItemIssueSeverityPickerSheetPage,
  }));
}

function loadItemFastIssueSheetPage() {
  return import('@/features/items/pages/ItemFastIssueSheetPage').then((module) => ({
    default: module.ItemFastIssueSheetPage,
  }));
}

export function preloadItemCategoryPickerSurface(): Promise<unknown> {
  if (preloadedItemSurfaces.has('item-category-picker')) {
    return Promise.resolve();
  }

  preloadedItemSurfaces.add('item-category-picker');
  return loadItemCategoryPickerSheetPage();
}

export function preloadItemIssueSeverityPickerSurface(): Promise<unknown> {
  if (preloadedItemSurfaces.has('item-issue-severity-picker')) {
    return Promise.resolve();
  }

  preloadedItemSurfaces.add('item-issue-severity-picker');
  return loadItemIssueSeverityPickerSheetPage();
}

export function preloadItemFastIssueSurface(): Promise<unknown> {
  if (preloadedItemSurfaces.has('item-fast-issue-page')) {
    return Promise.resolve();
  }

  preloadedItemSurfaces.add('item-fast-issue-page');
  return loadItemFastIssueSheetPage();
}

export const itemSurfaces: SurfaceRegistrations = {
  'item-category-picker': {
    surface: 'sheet',
    component: lazy(loadItemCategoryPickerSheetPage),
  },
  'item-issue-severity-picker': {
    surface: 'sheet',
    component: lazy(loadItemIssueSeverityPickerSheetPage),
  },
  'item-fast-issue-page': {
    surface: 'sheet',
    component: lazy(loadItemFastIssueSheetPage),
  },
};
