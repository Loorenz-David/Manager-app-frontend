import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@beyo/lib";

/** Controlled open state for a panel's drawers (logic-owned; see the
 * editor-panel-drawers plan). When a panel receives no `drawers` prop it
 * renders flat — today's layout — so the kit regroup alone changes nothing. */
export type PanelDrawersProp = {
  open: readonly string[];
  onToggle: (id: string) => void;
};

export const SLIDE_PANEL_DRAWERS = {
  media: "media",
  timing: "timing",
  background: "background",
  button: "button",
} as const;

export const TEXT_PANEL_DRAWERS = {
  content: "content",
  style: "style",
  animations: "animations",
} as const;

export const MEDIA_PANEL_DRAWERS = {
  media: "media",
  animations: "animations",
} as const;

type PanelDrawerProps = {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  /** Renders a red dot on the header (e.g. a validation error inside a closed
   * drawer). Provide a short description for assistive tech. */
  errorBadge?: string;
  children: ReactNode;
};

/** One collapsible tool group in the editor's right panel. Controlled and
 * props-only: the logic layer owns which drawers are open. */
export function PanelDrawer({
  id,
  title,
  isOpen,
  onToggle,
  errorBadge,
  children,
}: PanelDrawerProps): React.JSX.Element {
  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-[#e2e2e2] bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        data-testid={`presentation-panel-drawer-${id}`}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f7f7f7] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3f78a8]"
      >
        <span className="flex items-center gap-2">
          {title}
          {errorBadge && (
            <span
              role="status"
              aria-label={errorBadge}
              data-testid={`presentation-panel-drawer-${id}-error-badge`}
              className="size-1.5 rounded-full bg-[#c05a5a]"
            />
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-[#9a9a9a] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* -mt-1 pulls the first PanelSection's own top margin back in line. */}
        <div className="min-h-0 overflow-hidden">
          <div className="-mt-1 px-3 pb-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
