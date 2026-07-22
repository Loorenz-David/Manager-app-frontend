import type { ReactNode } from "react";

type EditorShellProps = {
  topBar: ReactNode;
  /** Shown between the top bar and the working area, e.g. the read-only banner. */
  banner?: ReactNode;
  rail: ReactNode;
  /** Center working area (canvas now; canvas + timeline in Phase 5). */
  children: ReactNode;
  /** Right properties panel (Phase 5); the slot exists so the layout is stable. */
  panel?: ReactNode;
};

/** The editor's three-region desktop layout: left rail, center work area, right panel. */
export function EditorShell({
  topBar,
  banner,
  rail,
  children,
  panel,
}: EditorShellProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-editor-shell"
      className="flex h-full min-h-0 flex-col bg-white"
    >
      {topBar}
      {banner}
      <div className="flex min-h-0 flex-1">
        <aside className="w-[186px] shrink-0 overflow-y-auto border-r border-[#e7e7e7] bg-[#fafafa]">
          {rail}
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f4f4f4]">
          {children}
        </main>
        {panel && (
          <aside className="w-[250px] shrink-0 overflow-y-auto border-l border-[#e7e7e7] bg-[#fafafa]">
            {panel}
          </aside>
        )}
      </div>
    </div>
  );
}
