import type { StatePillVariant } from "@beyo/ui";

// Mirrors StatePill's variant palette for the ticker/state+time chips used
// across the stats cards (current state, granularity time pill).
export const STATE_CHIP_CLASS: Record<StatePillVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  active: "border border-[#b8d9ff] bg-[#eaf4ff] text-[#1f5ea8]",
  warning: "border border-[#f0c36a] bg-[#fff4d6] text-[#8a5a00]",
  success: "border border-[#9ed9b5] bg-[#eaf8ef] text-[#1e7a46]",
  danger: "border border-[#ecb0aa] bg-[#fdecea] text-[#b9382a]",
};
