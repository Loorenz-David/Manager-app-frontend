import { RouterProvider } from "react-router-dom";
import { SystemGate } from "@beyo/system-control";

import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";

export function App(): React.JSX.Element {
  // The gate sits outside the router and the AuthProvider: nothing that talks
  // to the backend mounts before the system is READY the first time, and a
  // sleeping kiosk shows DORMANT on top of its still-mounted keypad.
  return (
    <AppProviders>
      <SystemGate>
        <RouterProvider router={router} />
      </SystemGate>
    </AppProviders>
  );
}
