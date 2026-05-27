import type { WorkingSectionShortcutConfig } from "../types";

// TODO: verify these substring patterns against production working-section names.
export const DEFAULT_WORKING_SECTION_SHORTCUTS: WorkingSectionShortcutConfig = {
  "Full job": [
    "disassembly",
    "cleaning",
    "structural repair",
    "sanding",
    "padding",
    "assembly",
    "upholstery",
  ],
  Upholstery: ["upholstery"],
  "Chair Fix": ["structural repair", "sanding", "cleaning"],
  "wood fix": ["wood fix", "ground oil", "hardwax oil", "cleaning"],
};
