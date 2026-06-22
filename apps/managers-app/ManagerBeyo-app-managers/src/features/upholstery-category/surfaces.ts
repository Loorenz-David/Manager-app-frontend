import { lazyWithPreload } from "@beyo/ui";

import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID =
  "upholstery-category-creation-slide";

const categoryCreationSlide = lazyWithPreload(() =>
  import("./pages/UpholsteryCategoryCreationSlidePage").then((module) => ({
    default: module.UpholsteryCategoryCreationSlidePage,
  })),
);

export const preloadUpholsteryCategoryCreationSurface =
  categoryCreationSlide.preload;

export const upholsteryCategorySurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID]: {
    surface: "slide",
    component: categoryCreationSlide.Component,
  },
};
