import type { SurfaceRegistrations } from "@beyo/ui";

export const surfaceRegistry: SurfaceRegistrations = {};

export type SurfaceId = keyof typeof surfaceRegistry;
