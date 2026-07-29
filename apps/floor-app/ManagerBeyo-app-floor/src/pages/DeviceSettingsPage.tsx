import { useState } from "react";
import { useSignOutMutation } from "@beyo/auth";
import {
  DeviceSettingsPanel,
  DeviceSettingsRow,
  KioskButton,
} from "@beyo/clock-kiosk";
import { useSurface } from "@beyo/hooks";

import { DEVICE_SETTINGS_SURFACE_ID } from "@/app/surface-registry";
import { FloorKioskFrame } from "@/components/FloorKioskFrame";
import {
  AUTO_RETURN_SECONDS_RANGE,
  useDeviceConfigStore,
} from "@/store/device-config.store";

export function DeviceSettingsPage(): React.JSX.Element {
  const surface = useSurface();
  const terminalLabel = useDeviceConfigStore((state) => state.terminalLabel);
  const autoReturnSeconds = useDeviceConfigStore(
    (state) => state.autoReturnSeconds,
  );
  const setTerminalLabel = useDeviceConfigStore(
    (state) => state.setTerminalLabel,
  );
  const setAutoReturnSeconds = useDeviceConfigStore(
    (state) => state.setAutoReturnSeconds,
  );
  const resetDeviceConfig = useDeviceConfigStore(
    (state) => state.resetDeviceConfig,
  );
  const [terminalLabelDraft, setTerminalLabelDraft] = useState(terminalLabel);
  const [autoReturnDraft, setAutoReturnDraft] = useState(
    String(autoReturnSeconds),
  );
  const [autoReturnError, setAutoReturnError] = useState<string | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [clearDeviceConfig, setClearDeviceConfig] = useState(true);

  const closeSettings = () => surface.close(DEVICE_SETTINGS_SURFACE_ID);
  const signOut = useSignOutMutation({
    appScope: "floor",
    onSignedOut: () => {
      if (clearDeviceConfig) {
        resetDeviceConfig();
      }
      closeSettings();
    },
  });

  const saveSettings = () => {
    const parsedAutoReturn = Number(autoReturnDraft);
    if (
      !Number.isInteger(parsedAutoReturn) ||
      parsedAutoReturn < AUTO_RETURN_SECONDS_RANGE.min ||
      parsedAutoReturn > AUTO_RETURN_SECONDS_RANGE.max
    ) {
      setAutoReturnError(
        `Enter a whole number from ${AUTO_RETURN_SECONDS_RANGE.min} to ${AUTO_RETURN_SECONDS_RANGE.max} seconds.`,
      );
      return;
    }

    setTerminalLabel(terminalLabelDraft.trim());
    setAutoReturnSeconds(parsedAutoReturn);
    closeSettings();
  };

  return (
    <FloorKioskFrame
      footer={
        <KioskButton
          data-testid="device-settings-save"
          onClick={saveSettings}
          variant="accent"
        >
          Save settings
        </KioskButton>
      }
    >
      <DeviceSettingsPanel
        footer={
          confirmingLogout ? (
            <div
              className="space-y-4 rounded-[20px] bg-kiosk-error/10 p-5"
              data-testid="device-logout-confirm"
            >
              <p className="text-sm font-medium text-kiosk-error">
                Log out this shared terminal?
              </p>
              <label className="flex min-h-11 items-center gap-3 text-sm text-kiosk-secondary">
                <input
                  checked={clearDeviceConfig}
                  className="size-5 accent-kiosk-error"
                  onChange={(event) =>
                    setClearDeviceConfig(event.target.checked)
                  }
                  type="checkbox"
                />
                Clear the terminal label and device settings
              </label>
              <div className="flex flex-wrap gap-3">
                <KioskButton
                  onClick={() => setConfirmingLogout(false)}
                  size="md"
                  variant="muted"
                >
                  Cancel
                </KioskButton>
                <KioskButton
                  data-testid="device-logout-confirm-button"
                  disabled={signOut.isPending}
                  onClick={() => signOut.mutate()}
                  size="md"
                  variant="danger"
                >
                  {signOut.isPending ? "Logging out…" : "Confirm log out"}
                </KioskButton>
              </div>
            </div>
          ) : (
            <KioskButton
              data-testid="device-logout-button"
              onClick={() => setConfirmingLogout(true)}
              size="md"
              variant="danger"
            >
              Log out this terminal
            </KioskButton>
          )
        }
        subtitle="Changes apply to this device only."
        title="Terminal settings"
      >
        <DeviceSettingsRow
          control={
            <input
              className="h-11 w-48 rounded-xl border border-kiosk-line bg-kiosk-surface px-3 text-right text-sm text-kiosk-ink outline-none focus:border-kiosk-accent"
              data-testid="device-terminal-label-input"
              onChange={(event) => setTerminalLabelDraft(event.target.value)}
              type="text"
              value={terminalLabelDraft}
            />
          }
          description="Shown in the kiosk header"
          label="Terminal label"
        />
        <DeviceSettingsRow
          control={
            <input
              aria-describedby={
                autoReturnError ? "device-auto-return-error" : undefined
              }
              aria-invalid={autoReturnError ? true : undefined}
              className="h-11 w-24 rounded-xl border border-kiosk-line bg-kiosk-surface px-3 text-right font-kiosk-mono text-sm text-kiosk-ink outline-none focus:border-kiosk-accent"
              data-testid="device-auto-return-input"
              inputMode="numeric"
              max={AUTO_RETURN_SECONDS_RANGE.max}
              min={AUTO_RETURN_SECONDS_RANGE.min}
              onChange={(event) => {
                setAutoReturnDraft(event.target.value);
                setAutoReturnError(null);
              }}
              step="1"
              type="number"
              value={autoReturnDraft}
            />
          }
          description="Seconds before returning to the kiosk"
          label="Auto-return"
        />
        {autoReturnError ? (
          <p
            className="text-sm text-kiosk-error"
            data-testid="device-auto-return-error"
            id="device-auto-return-error"
            role="alert"
          >
            {autoReturnError}
          </p>
        ) : null}
      </DeviceSettingsPanel>
    </FloorKioskFrame>
  );
}
