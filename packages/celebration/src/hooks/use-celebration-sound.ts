import { useCallback, useRef } from "react";

export function useCelebrationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((url: string) => {
    try {
      audioRef.current?.pause();
      audioRef.current = new Audio(url);
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {
        // Missing files and autoplay blocks should not break completion flows.
      });
    } catch {
      // Swallow audio construction failures to keep the overlay non-blocking.
    }
  }, []);

  return { play };
}
