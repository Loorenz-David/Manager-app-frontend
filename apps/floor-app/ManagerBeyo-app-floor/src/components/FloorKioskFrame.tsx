import type { HTMLAttributes, ReactNode } from "react";
import { selectUser, useAuthStore } from "@beyo/auth";
import { KioskFrame, KioskHeader } from "@beyo/clock-kiosk";

import { useKioskClock } from "@/hooks/use-kiosk-clock";
import { useDeviceConfigStore } from "@/store/device-config.store";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  identitySlotProps?: HTMLAttributes<HTMLDivElement>;
};

export function FloorKioskFrame({
  children,
  footer,
  identitySlotProps,
}: Props): React.JSX.Element {
  const user = useAuthStore(selectUser);
  const terminalLabel = useDeviceConfigStore((state) => state.terminalLabel);
  const clock = useKioskClock(user?.timeZone ?? "UTC");

  return (
    <KioskFrame
      footer={footer}
      header={
        <KioskHeader
          date={clock.date}
          identitySlotProps={identitySlotProps}
          terminalLabel={terminalLabel}
          time={clock.time}
          workspaceName={user?.workspaceName ?? "ManagerBeyo"}
        />
      }
    >
      {children}
    </KioskFrame>
  );
}
