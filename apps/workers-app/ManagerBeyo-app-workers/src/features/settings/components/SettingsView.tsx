import { useEffect, useRef } from "react";
import { LogOut } from "lucide-react";

import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import { useSettingsViewContext } from "../providers/SettingsViewProvider";

export function SettingsView(): React.JSX.Element {
  const { signOut, isSigningOut } = useSettingsViewContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [registerScrollElement]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-y-none">
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <button
        type="button"
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-destructive disabled:opacity-60"
        data-testid="settings-sign-out-button"
        disabled={isSigningOut}
        onClick={signOut}
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        {isSigningOut ? "Signing out..." : "Log out"}
      </button>
      <div className="h-[1000px] w-full bg-black"></div>
    </div>
    </div>
  );
}
