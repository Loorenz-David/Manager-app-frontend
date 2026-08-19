/**
 * Surface IDs and the injected opener map for the item economics package.
 *
 * Packages never call `openSurface` — apps register the surfaces and inject
 * concrete implementations through `surfaceOpeners`. See
 * architecture/35_shared_packages.md §13.
 *
 * Add one constant per surface and one optional key per opener as the
 * components land.
 */

export type ItemEconomicsSurfaceOpeners = Record<string, never>;
