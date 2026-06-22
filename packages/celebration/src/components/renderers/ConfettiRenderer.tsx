import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useReducedMotion } from "framer-motion";
import type { CelebrationIntensity } from "../../types";

const intensityMap: Record<
  CelebrationIntensity,
  { particleCount: number; spread: number; startVelocity: number }
> = {
  low: { particleCount: 60, spread: 50, startVelocity: 30 },
  medium: { particleCount: 130, spread: 70, startVelocity: 40 },
  high: { particleCount: 250, spread: 100, startVelocity: 55 },
};

type ConfettiRendererProps = {
  intensity: CelebrationIntensity;
};

export function ConfettiRenderer({
  intensity,
}: ConfettiRendererProps): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || !canvasRef.current) {
      return;
    }

    const myConfetti = confetti.create(canvasRef.current, { resize: true });
    const options = intensityMap[intensity];

    void myConfetti({
      ...options,
      origin: { x: 0.2, y: 0.55 },
      angle: 60,
    });
    void myConfetti({
      ...options,
      origin: { x: 0.8, y: 0.55 },
      angle: 120,
    });

    return () => {
      myConfetti.reset();
    };
  }, [intensity, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
