import { AnimatePresence, m } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { tabVariants, transitions } from '@/lib/animation';

type LocationState = { direction?: number } | null;

export function TabOutlet(): React.JSX.Element {
  const location = useLocation();
  const direction = (location.state as LocationState)?.direction ?? 0;

  return (
    <AnimatePresence custom={direction} initial={false}>
      <m.div
        animate="center"
        className="absolute inset-0 overflow-hidden transform-gpu [backface-visibility:hidden] [will-change:transform]"
        custom={direction}
        exit="exit"
        initial="enter"
        key={location.pathname}
        transition={transitions.tab}
        variants={tabVariants}
      >
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </m.div>
    </AnimatePresence>
  );
}
