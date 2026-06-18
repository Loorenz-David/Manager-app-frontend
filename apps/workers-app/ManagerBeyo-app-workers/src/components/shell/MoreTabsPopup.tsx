import {
  ChartColumnIncreasing,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import {
  NavTabBadge,
  VerticalScrollArea,
  type NavTabBadgeItem,
} from "@beyo/ui";

import {
  MORE_TABS,
  ROUTES,
  type MoreTabPath,
} from "@/lib/routes";

const MORE_TAB_META: Record<MoreTabPath, { label: string; icon: LucideIcon }> = {
  [ROUTES.stats]: { label: "Stats", icon: ChartColumnIncreasing },
  [ROUTES.settings]: { label: "Settings", icon: Settings2 },
};

type MoreTabsPopupProps = {
  isOpen: boolean;
  activeMoreTabPath: MoreTabPath;
  badgeState: Partial<
    Record<
      MoreTabPath,
      {
        items: NavTabBadgeItem[];
        visible: boolean;
      }
    >
  >;
  onSelectTab: (path: MoreTabPath) => void;
};

type MoreTabRowProps = {
  path: MoreTabPath;
  items: NavTabBadgeItem[];
  visible: boolean;
  onSelect: (path: MoreTabPath) => void;
};

function MoreTabRow({
  path,
  items,
  visible,
  onSelect,
}: MoreTabRowProps): React.JSX.Element {
  const meta = MORE_TAB_META[path];
  const Icon = meta.icon;

  return (
    <button
      className={[
        "relative flex h-[60px] w-full flex-col items-center justify-center gap-0.5 text-xs transition-colors",
        "text-icon",
      ].join(" ")}
      data-testid={`more-tab-${meta.label.toLowerCase()}`}
      type="button"
      onClick={() => onSelect(path)}
    >
      <NavTabBadge items={items} visible={visible} />
      <Icon className="h-5 w-5" strokeWidth={2} />
      <span>{meta.label}</span>
    </button>
  );
}

export function MoreTabsPopup({
  isOpen,
  activeMoreTabPath,
  badgeState,
  onSelectTab,
}: MoreTabsPopupProps): React.JSX.Element {
  const availableMoreTabs = MORE_TABS.filter((path) => path !== activeMoreTabPath);

  return (
    <div
      aria-label="More tabs"
      className={[
        "absolute bottom-full right-0 z-0 w-full overflow-hidden rounded-t-xl border border-b-0 bg-background shadow-lg",
        "origin-bottom transform-gpu will-change-transform",
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        isOpen
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      ].join(" ")}
      data-testid="more-tabs-popup"
      role="menu"
    >
      <VerticalScrollArea style={{ maxHeight: "240px" }}>
        <div className="flex w-full flex-col">
          {availableMoreTabs.map((path) => (
            <MoreTabRow
              key={path}
              items={badgeState[path]?.items ?? []}
              path={path}
              visible={badgeState[path]?.visible ?? false}
              onSelect={onSelectTab}
            />
          ))}
        </div>
      </VerticalScrollArea>
    </div>
  );
}
