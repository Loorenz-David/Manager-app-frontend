import { useEffect, useRef } from "react";
import { Bell, BellOff, LogOut } from "lucide-react";
import type { PushSubscriptionStatus } from "@beyo/notifications";

import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import { useSettingsViewContext } from "../providers/SettingsViewProvider";

function pushStatusLabel(status: PushSubscriptionStatus): string {
  switch (status) {
    case "registered":
      return "Notifications enabled";
    case "not_requested":
    case "unregistered":
      return "Notifications disabled";
    case "denied":
      return "Notifications blocked - enable in browser settings";
    case "needs_ios_pwa":
      return "Add to Home Screen to enable notifications";
    case "unsupported":
      return "Notifications not supported in this browser";
    case "registering":
      return "Setting up notifications...";
    case "error":
      return "Notification setup failed - try again";
    default:
      return "";
  }
}

export function SettingsView(): React.JSX.Element {
  const {
    signOut,
    isSigningOut,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  } = useSettingsViewContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [registerScrollElement]);

  const canToggle =
    pushStatus !== "unsupported" &&
    pushStatus !== "needs_ios_pwa" &&
    pushStatus !== "denied" &&
    pushStatus !== "registering";
  const isEnabled = pushStatus === "registered";

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-y-none">
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notifications
          </h2>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {isEnabled ? (
                <Bell
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
              ) : (
                <BellOff
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              <span className="min-w-0 text-sm">
                {pushStatusLabel(pushStatus)}
              </span>
            </div>
            {canToggle ? (
              <button
                type="button"
                className="shrink-0 text-sm font-medium text-primary disabled:opacity-50"
                disabled={isPushLoading}
                onClick={isEnabled ? disablePush : enablePush}
                data-testid="settings-push-toggle-button"
              >
                {isEnabled ? "Disable" : "Enable"}
              </button>
            ) : null}
          </div>
        </div>

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
        <div className="h-[1000px] w-full bg-black" />
      </div>
    </div>
  );
}
