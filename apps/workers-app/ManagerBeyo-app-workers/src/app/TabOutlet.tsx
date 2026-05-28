import { AnimatePresence, m } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { tabVariants, transitions } from "@/lib/animation";

type LocationState = {
  direction?: number;
  background?: { pathname: string; search: string };
  skipTabAnimation?: boolean;
} | null;

export function TabOutlet(): React.JSX.Element {
  const location = useLocation();
  const state = location.state as LocationState;
  const direction = state?.direction ?? 0;
  const skipTabAnimation = state?.skipTabAnimation ?? false;
  const tabKey = state?.background
    ? `${state.background.pathname}${state.background.search}`
    : `${location.pathname}${location.search}`;
  const tabTransition = skipTabAnimation ? { duration: 0 } : transitions.tab;

  return (
    <AnimatePresence custom={direction} initial={false}>
      <m.div
        animate="center"
        className="absolute inset-0 overflow-hidden transform-gpu backface-hidden will-change-transform"
        custom={direction}
        exit="exit"
        initial="enter"
        key={tabKey}
        transition={tabTransition}
        variants={tabVariants}
      >
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </m.div>
    </AnimatePresence>
  );
}
