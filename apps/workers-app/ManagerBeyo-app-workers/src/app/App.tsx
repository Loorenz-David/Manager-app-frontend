import { CelebrationOverlay } from "@beyo/celebration";
import { FinalPlacementReminderOverlay } from "@/features/task_steps/components/FinalPlacementReminderOverlay";
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers';
import { router } from './router';

export function App(): React.JSX.Element {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <CelebrationOverlay />
      <FinalPlacementReminderOverlay />
    </AppProviders>
  );
}
