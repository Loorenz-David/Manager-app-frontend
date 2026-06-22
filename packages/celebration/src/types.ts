export type CelebrationIntensity = "low" | "medium" | "high";

export type CelebrationVariant =
  | { type: "confetti"; intensity: CelebrationIntensity }
  | { type: "none" };

export type MessageConfig = {
  headline: React.ReactNode;
  subline?: string;
};

export type CelebrationConfig = {
  variant: CelebrationVariant;
  message?: MessageConfig;
  soundUrl?: string;
  duration?: number;
};
