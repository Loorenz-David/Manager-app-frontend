export const PARTICIPANT_AUTO_SELECT_RULES: Record<string, string[]> = {
  worker: ["manager"],
  seller: ["manager"],
  admin: ["manager", "seller"],
};
