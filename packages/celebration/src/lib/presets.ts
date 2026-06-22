import type { ReactNode } from "react";
import type { CelebrationConfig } from "../types";

export const celebrationPresets = {
  TASK_COMPLETE: (
    username: string,
    headline: ReactNode = "Great job",
    soundUrl = "/sounds/celebration.mp3",
  ): CelebrationConfig => ({
    variant: { type: "confetti", intensity: "medium" },
    message: { headline, subline: username ? `Keep it up\n${username}` : "Keep it up" },
    soundUrl,
    duration: 5000,
  }),
} as const;
