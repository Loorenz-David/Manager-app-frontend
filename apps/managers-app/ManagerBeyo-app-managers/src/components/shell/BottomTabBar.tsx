import {
  ChartColumnIncreasing,
  House,
  ListTodo,
  MessageCircle,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { preloadPrimaryTabRoute } from '@/lib/primary-tab-preload';
import { ROUTES, TAB_ORDER, type TabPath } from '@/lib/routes';

type Tab = {
  label: string;
  icon: LucideIcon;
  path: TabPath;
};

const TABS: Tab[] = [
  { path: ROUTES.tasks, label: 'Tasks', icon: ListTodo },
  { path: ROUTES.cases, label: 'Cases', icon: MessageCircle },
  { path: ROUTES.home, label: 'Home', icon: House },
  { path: ROUTES.stats, label: 'Stats', icon: ChartColumnIncreasing },
  { path: ROUTES.settings, label: 'Settings', icon: Settings2 },
];

function useTabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return function handleTabPress(targetPath: TabPath): void {
    if (location.pathname === targetPath) {
      return;
    }

    const fromIndex = TAB_ORDER.indexOf(location.pathname as TabPath);
    const toIndex = TAB_ORDER.indexOf(targetPath);
    const direction = toIndex > fromIndex ? 1 : -1;

    navigate(targetPath, { state: { direction } });
  };
}

export function BottomTabBar(): React.JSX.Element {
  const location = useLocation();
  const handleTabPress = useTabNav();
  const activeIndex = TABS.findIndex((tab) => tab.path === location.pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="flex-shrink-0 border-t bg-background"
      data-testid="bottom-tab-bar"
    >
      <div className="relative flex h-[60px] items-stretch">
        <div
          aria-hidden="true"
          className="absolute top-0 h-0.5 w-1/5 bg-primary transition-[transform,opacity] duration-350 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-icon',
              ].join(' ')}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              key={tab.path}
              onFocus={() => {
                preloadPrimaryTabRoute(tab.path);
              }}
              onClick={() => handleTabPress(tab.path)}
              onPointerDown={() => {
                preloadPrimaryTabRoute(tab.path);
              }}
              type="button"
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="h-[var(--safe-bottom,0px)]" />
    </nav>
  );
}
