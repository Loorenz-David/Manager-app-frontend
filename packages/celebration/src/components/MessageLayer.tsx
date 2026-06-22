import { m, useReducedMotion } from "framer-motion";
import { transitions } from "@beyo/lib";
import type { MessageConfig } from "../types";

type MessageLayerProps = {
  message: MessageConfig;
};

export function MessageLayer({
  message,
}: MessageLayerProps): React.JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative z-[1] flex flex-col items-center gap-4 px-6 text-center">
      <div>{message.headline}</div>

      {message.subline ? (
        <m.p
          animate={{ opacity: 1, y: 0 }}
          className="font-celebration whitespace-pre-line text-center text-2xl font-semibold leading-snug text-card drop-shadow sm:text-3xl"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          transition={{ ...transitions.base, delay: 0.2 }}
        >
          {message.subline}
        </m.p>
      ) : null}
    </div>
  );
}
