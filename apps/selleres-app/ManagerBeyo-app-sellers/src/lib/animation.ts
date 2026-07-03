export const durations = {
  instant: 0.08,
  fast: 0.12,
  base: 0.16,
  slow: 0.22,
  slide: 0.24,
} as const;

export const easings = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.16, 1, 0.3, 1],
  slideIn: [0.22, 1, 0.36, 1],
} as const;

export const transitions = {
  fast: {
    duration: durations.fast,
    ease: easings.standard,
  },
  base: {
    duration: durations.base,
    ease: easings.standard,
  },
  surface: {
    duration: durations.slow,
    ease: easings.emphasized,
  },
  slide: {
    duration: durations.slide,
    ease: easings.slideIn,
  },
  tab: {
    duration: durations.slow,
    ease: easings.standard,
  },
} as const;

export const tabVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '100%' : '-100%',
  }),
  center: {
    x: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
  }),
} as const;
