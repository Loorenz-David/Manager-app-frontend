import { useEffect, useState, type FormEvent } from "react";
import { SignInForm } from "@beyo/auth";
import {
  DeviceSignInCard,
  KioskFrame,
  KioskHeader,
} from "@beyo/clock-kiosk";
import { useNavigate } from "react-router-dom";

import { useKioskClock } from "@/hooks/use-kiosk-clock";
import {
  clearFloorSessionExpired,
  hasFloorSessionExpired,
} from "@/lib/floor-session-expired";
import { ROUTES } from "@/lib/routes";
import { useDeviceConfigStore } from "@/store/device-config.store";

export function SignInPage(): React.JSX.Element {
  const navigate = useNavigate();
  const storedTerminalLabel = useDeviceConfigStore(
    (state) => state.terminalLabel,
  );
  const setTerminalLabel = useDeviceConfigStore(
    (state) => state.setTerminalLabel,
  );
  const [terminalLabelDraft, setTerminalLabelDraft] = useState(
    storedTerminalLabel,
  );
  const [terminalLabelError, setTerminalLabelError] = useState<string | null>(
    null,
  );
  const [showSessionExpiredNote] = useState(hasFloorSessionExpired);
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const clock = useKioskClock(localTimeZone);

  useEffect(() => {
    if (showSessionExpiredNote) {
      clearFloorSessionExpired();
    }
  }, [showSessionExpiredNote]);

  const guardTerminalLabel = (event: FormEvent<HTMLDivElement>) => {
    if (terminalLabelDraft.trim()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setTerminalLabelError("Enter a label for this terminal.");
  };

  const handleSuccess = () => {
    setTerminalLabel(terminalLabelDraft.trim());
    navigate(ROUTES.home, { replace: true });
  };

  return (
    <KioskFrame
      header={
        <KioskHeader
          date={clock.date}
          terminalLabel={terminalLabelDraft || "UNCONFIGURED TERMINAL"}
          time={clock.time}
          workspaceName="ManagerBeyo"
        />
      }
    >
      <DeviceSignInCard
        footnote="Floor device sign-in"
        subtitle="Sign in with a manager account to bind this device to the floor."
        title="Set up this terminal"
      >
        {showSessionExpiredNote ? (
          <p
            className="rounded-xl bg-kiosk-error/10 px-4 py-3 text-sm text-kiosk-error"
            data-testid="floor-session-expired-note"
            role="status"
          >
            This terminal was signed out. Sign in again to continue.
          </p>
        ) : null}
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium text-kiosk-secondary"
            htmlFor="terminal-label"
          >
            Terminal label
          </label>
          <input
            className="h-12 w-full rounded-lg border border-kiosk-line bg-kiosk-surface px-3 text-kiosk-ink outline-none focus:border-kiosk-accent"
            data-testid="floor-terminal-label-input"
            id="terminal-label"
            onChange={(event) => {
              setTerminalLabelDraft(event.target.value);
              setTerminalLabelError(null);
            }}
            placeholder="TERMINAL 04 · BAY B"
            type="text"
            value={terminalLabelDraft}
          />
          {terminalLabelError ? (
            <p className="text-xs text-kiosk-error">{terminalLabelError}</p>
          ) : null}
        </div>
        <div onSubmitCapture={guardTerminalLabel}>
          <SignInForm appScope="floor" onSuccess={handleSuccess} />
        </div>
      </DeviceSignInCard>
    </KioskFrame>
  );
}
