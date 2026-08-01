export const WORKER_STATE_SHEET_SURFACE_ID = "worker-state-sheet";

/**
 * The state sheet reads everything it needs from the worker-shift query, so it
 * takes no props. Declared for symmetry with the other surfaces.
 */
export type WorkerStateSheetSurfaceProps = Record<string, never>;
