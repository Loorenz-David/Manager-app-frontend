import type { CSSProperties } from "react";

import type {
  AnimationEasing,
  AnimationType,
  CompositionElement,
  ElementAnimation,
} from "./schemas";

export const DEFAULT_ANIMATION_DURATION_MS = 450;
export const DEFAULT_ANIMATION_OFFSET_PX = 20;

export type AnimationPhase = "enter" | "exit";

export type AnimationFrame = {
  opacity: number;
  transform?: string;
};

type AnimationRecipe = (progress: number, phase: AnimationPhase, distancePx: number) => AnimationFrame;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const easingFunctions: Record<AnimationEasing, (progress: number) => number> = {
  linear: (progress) => progress,
  ease: (progress) => progress * progress * (3 - 2 * progress),
  ease_in: (progress) => progress * progress,
  ease_out: (progress) => 1 - (1 - progress) * (1 - progress),
  ease_in_out: (progress) =>
    progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2,
};

const translate = (axis: "X" | "Y", amount: number): AnimationFrame => ({
  opacity: 1,
  transform: `translate${axis}(${amount}px)`,
});

export const animationRegistry: Record<AnimationType, AnimationRecipe> = {
  none: () => ({ opacity: 1 }),
  fade: (progress) => ({ opacity: progress }),
  fade_up: (progress, phase, distance) => ({
    opacity: progress,
    transform: `translateY(${phase === "enter" ? (1 - progress) * distance : -(1 - progress) * distance}px)`,
  }),
  fade_down: (progress, phase, distance) => ({
    opacity: progress,
    transform: `translateY(${phase === "enter" ? -(1 - progress) * distance : (1 - progress) * distance}px)`,
  }),
  slide_left: (progress, phase, distance) =>
    translate("X", phase === "enter" ? (1 - progress) * distance : -(1 - progress) * distance),
  slide_right: (progress, phase, distance) =>
    translate("X", phase === "enter" ? -(1 - progress) * distance : (1 - progress) * distance),
  scale_in: (progress, phase) => ({
    opacity: 1,
    transform: `scale(${phase === "enter" ? 0.9 + progress * 0.1 : 1 + (1 - progress) * 0.1})`,
  }),
  scale_out: (progress, phase) => ({
    opacity: 1,
    transform: `scale(${phase === "enter" ? 1.1 - progress * 0.1 : 0.9 + progress * 0.1})`,
  }),
};

function animationProgress(
  animation: ElementAnimation | null,
  phase: AnimationPhase,
  timeMs: number,
  boundaryMs: number,
): number {
  if (animation === null || animation.type === "none") return 1;
  const duration = animation?.duration_ms ?? DEFAULT_ANIMATION_DURATION_MS;
  const delay = animation?.delay_ms ?? 0;
  if (duration <= 0) return 1;
  const raw = phase === "enter"
    ? (timeMs - boundaryMs - delay) / duration
    : (boundaryMs - delay - timeMs) / duration;
  const easing = easingFunctions[animation?.easing ?? "linear"];
  return easing(clamp01(raw));
}

function recipeFrame(
  animation: ElementAnimation | null,
  progress: number,
  phase: AnimationPhase,
): AnimationFrame {
  const type = animation?.type ?? "none";
  const distancePx = (animation?.distance ?? 1) * DEFAULT_ANIMATION_OFFSET_PX;
  return animationRegistry[type](progress, phase, distancePx);
}

export function getElementAnimationFrame(
  element: CompositionElement,
  timeMs: number,
): AnimationFrame {
  if (timeMs < element.start_ms || (element.end_ms !== null && timeMs >= element.end_ms)) {
    return { opacity: 0 };
  }

  const pIn = animationProgress(element.enter_animation, "enter", timeMs, element.start_ms);
  const pOut = element.end_ms === null
    ? 1
    : animationProgress(element.exit_animation, "exit", timeMs, element.end_ms);
  const enterFrame = recipeFrame(element.enter_animation, pIn, "enter");
  const exitFrame = recipeFrame(element.exit_animation, pOut, "exit");
  const transforms = [enterFrame.transform, exitFrame.transform].filter(Boolean);

  return {
    opacity: Math.min(pIn, pOut, enterFrame.opacity, exitFrame.opacity),
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
  };
}

export function mergeAnimationStyle(
  base: CSSProperties,
  frame: AnimationFrame,
): CSSProperties {
  return {
    ...base,
    opacity: frame.opacity,
    transform: [base.transform, frame.transform].filter(Boolean).join(" ") || undefined,
  };
}
