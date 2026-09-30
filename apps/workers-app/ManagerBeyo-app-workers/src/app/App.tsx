import { CelebrationOverlay } from "@beyo/celebration";
import { SystemGate } from "@beyo/system-control";
import { FinalPlacementReminderOverlay } from "@/features/task_steps/components/FinalPlacementReminderOverlay";
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers';
import { router } from './router';

export function App(): React.JSX.Element {
  // The gate sits outside the router and the AuthProvider: nothing that talks
  // to the backend mounts before the system is READY the first time.
  return (
    <AppProviders>
      <SystemGate>
        <RouterProvider router={router} />
        <CelebrationOverlay />
        <FinalPlacementReminderOverlay />
      </SystemGate>
    </AppProviders>
  );
}
