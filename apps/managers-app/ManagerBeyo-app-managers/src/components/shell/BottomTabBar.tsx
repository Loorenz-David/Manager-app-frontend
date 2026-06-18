import {
  ChartColumnIncreasing,
  Grip,
  House,
  ListTodo,
  MessageCircle,
  Settings2,
  Spool,
  type LucideIcon,
} from "lucide-react";
import { NavTabBadge } from "@beyo/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { MoreTabsPopup } from "@/components/shell/MoreTabsPopup";
import { useMoreTabLastSelected } from "@/components/shell/use-more-tab-last-selected";
import { preloadPrimaryTabRoute } from "@/lib/primary-tab-preload";
import { useTabBadgeCountsContext } from "@/providers/TabBadgeCountsProvider";
import {
  MORE_TABS,
  PRIMARY_TABS,
  ROUTES,
  TAB_ORDER,
  type MoreTabPath,
  type TabPath,
} from "@/lib/routes";

type Tab = {
  label: string;
  icon: LucideIcon;
  path: TabPath;
};

const TABS: Tab[] = [
  { path: ROUTES.tasks, label: "Tasks", icon: ListTodo },
  { path: ROUTES.cases, label: "Cases", icon: MessageCircle },
  { path: ROUTES.home, label: "Home", icon: House },
  { path: ROUTES.stats, label: "Stats", icon: ChartColumnIncreasing },
  { path: ROUTES.upholsteryInventory, label: "Uph inv", icon: Spool },
  { path: ROUTES.settings, label: "Settings", icon: Settings2 },
];

const PRIMARY_TAB_META = TABS.filter((tab) =>
  (PRIMARY_TABS as readonly TabPath[]).includes(tab.path),
);

const MORE_TAB_META: Record<MoreTabPath, Tab> = {
  [ROUTES.stats]: TABS[3],
  [ROUTES.upholsteryInventory]: TABS[4],
  [ROUTES.settings]: TABS[5],
};

function isMoreTabPath(pathname: string): pathname is MoreTabPath {
  return (MORE_TABS as readonly string[]).includes(pathname);
}

function useTabNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dismissBadge } = useTabBadgeCountsContext();

  return function handleTabPress(targetPath: TabPath): void {
    dismissBadge(targetPath);

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
  const { badgeState } = useTabBadgeCountsContext();
  const { lastSelected, selectMoreTab } = useMoreTabLastSelected();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreWrapperRef = useRef<HTMLDivElement>(null);

  const activeMoreTabPath = isMoreTabPath(location.pathname)
    ? location.pathname
    : lastSelected;
  const dynamicTab = MORE_TAB_META[activeMoreTabPath];
  const activeIndex = useMemo(() => {
    if (location.pathname === ROUTES.tasks) {
      return 0;
    }
    if (location.pathname === ROUTES.cases) {
      return 1;
    }
    if (location.pathname === ROUTES.home) {
      return 2;
    }
    if (isMoreTabPath(location.pathname)) {
      return 3;
    }

    return -1;
  }, [location.pathname]);
  const hasMoreBadge = MORE_TABS.some((path) => badgeState[path]?.visible);

  useEffect(() => {
    if (isMoreTabPath(location.pathname) && location.pathname !== lastSelected) {
      selectMoreTab(location.pathname);
    }
  }, [lastSelected, location.pathname, selectMoreTab]);

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!moreWrapperRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  const handleMoreTabSelect = (path: MoreTabPath) => {
    selectMoreTab(path);
    setIsMoreOpen(false);
    handleTabPress(path);
  };

  return (
    <nav
      aria-label="Main navigation"
      className="z-[50] flex-shrink-0 border-t bg-background"
      data-testid="bottom-tab-bar"
    >
      <div className="relative isolate flex h-[60px] items-stretch bg-background">
        <div
          aria-hidden="true"
          className="absolute top-0 z-20 h-0.5 w-1/5 bg-primary transition-[transform,opacity] duration-350 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />
        {PRIMARY_TAB_META.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={[
                "relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 bg-background text-xs transition-colors",
                isActive ? "text-primary" : "text-icon",
              ].join(" ")}
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
              <NavTabBadge
                items={badgeState[tab.path]?.items ?? []}
                visible={badgeState[tab.path]?.visible ?? false}
              />

              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <button
          aria-current={location.pathname === dynamicTab.path ? "page" : undefined}
          className={[
            "relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 bg-background text-xs transition-colors",
            location.pathname === dynamicTab.path ? "text-primary" : "text-icon",
          ].join(" ")}
          data-testid={`tab-${dynamicTab.label.toLowerCase()}`}
          type="button"
          onClick={() => handleTabPress(dynamicTab.path)}
          onFocus={() => {
            preloadPrimaryTabRoute(dynamicTab.path);
          }}
          onPointerDown={() => {
            preloadPrimaryTabRoute(dynamicTab.path);
          }}
        >
          <NavTabBadge
            items={badgeState[dynamicTab.path]?.items ?? []}
            visible={badgeState[dynamicTab.path]?.visible ?? false}
          />

          <dynamicTab.icon className="h-5 w-5" strokeWidth={2} />
          <span>{dynamicTab.label}</span>
        </button>

        <div className="relative z-10 flex flex-1 bg-background" ref={moreWrapperRef}>
          <MoreTabsPopup
            activeMoreTabPath={activeMoreTabPath}
            badgeState={badgeState}
            isOpen={isMoreOpen}
            onSelectTab={handleMoreTabSelect}
          />

          <button
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 bg-background text-xs text-icon transition-colors"
            data-testid="tab-more"
            type="button"
            onClick={() => {
              setIsMoreOpen((prev) => !prev);
            }}
          >
            {hasMoreBadge ? (
              <span
                aria-hidden="true"
                className="absolute right-[calc(50%-16px)] top-2 size-2 rounded-full bg-[var(--color-destructive)]"
              />
            ) : null}

            <Grip className="h-5 w-5" strokeWidth={2} />
            <span>More</span>
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-[var(--safe-bottom,0px)]" />
    </nav>
  );
}
