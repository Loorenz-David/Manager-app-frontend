import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const QUERIES = {
  tablet: '(min-width: 768px)',
  desktop: '(min-width: 1024px)',
} as const;

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type BreakpointValue = {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

function getBreakpoint(): Breakpoint {
  if (window.matchMedia(QUERIES.desktop).matches) {
    return 'desktop';
  }

  if (window.matchMedia(QUERIES.tablet).matches) {
    return 'tablet';
  }

  return 'mobile';
}

export const BreakpointContext = createContext<BreakpointValue>({
  breakpoint: 'desktop',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
});

type BreakpointProviderProps = {
  children: ReactNode;
};

export function BreakpointProvider({
  children,
}: BreakpointProviderProps): React.JSX.Element {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(
    typeof window !== 'undefined' ? getBreakpoint() : 'desktop',
  );

  useEffect(() => {
    const desktop = window.matchMedia(QUERIES.desktop);
    const tablet = window.matchMedia(QUERIES.tablet);
    const update = () => setBreakpoint(getBreakpoint());

    desktop.addEventListener('change', update);
    tablet.addEventListener('change', update);

    return () => {
      desktop.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);

  const value: BreakpointValue = {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };

  return <BreakpointContext.Provider value={value}>{children}</BreakpointContext.Provider>;
}

export function useBreakpoint(): BreakpointValue {
  return useContext(BreakpointContext);
}
