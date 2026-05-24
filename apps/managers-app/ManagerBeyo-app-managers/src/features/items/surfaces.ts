import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import { lazyWithPreload } from '@/utils/lazy-with-preload';

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

const itemCategoryPicker = lazyWithPreload(loadItemCategoryPickerSheetPage);
const itemIssueSeverityPicker = lazyWithPreload(loadItemIssueSeverityPickerSheetPage);
const itemFastIssuePage = lazyWithPreload(loadItemFastIssueSheetPage);

export const preloadItemCategoryPickerSurface = itemCategoryPicker.preload;
export const preloadItemIssueSeverityPickerSurface = itemIssueSeverityPicker.preload;
export const preloadItemFastIssueSurface = itemFastIssuePage.preload;

export const itemSurfaces: SurfaceRegistrations = {
  'item-category-picker': {
    surface: 'sheet',
    component: itemCategoryPicker.Component,
  },
  'item-issue-severity-picker': {
    surface: 'sheet',
    component: itemIssueSeverityPicker.Component,
  },
  'item-fast-issue-page': {
    surface: 'sheet',
    component: itemFastIssuePage.Component,
  },
};
