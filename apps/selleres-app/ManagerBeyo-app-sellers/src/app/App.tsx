import { RouterProvider } from "react-router-dom";
import { SystemGate } from "@beyo/system-control";
import { AppProviders } from "./providers";
import { router } from "./router";

export function App(): React.JSX.Element {
  // The gate sits outside the router and the AuthProvider: nothing that talks
  // to the backend mounts before the system is READY the first time.
  return (
    <AppProviders>
      <SystemGate>
        <RouterProvider router={router} />
      </SystemGate>
    </AppProviders>
  );
}
