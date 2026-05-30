import { SettingsView } from "./components/SettingsView";
import { SettingsViewProvider } from "./providers/SettingsViewProvider";

export function SettingsRouteEntry(): React.JSX.Element {
  return (
    <SettingsViewProvider>
      <SettingsView />
    </SettingsViewProvider>
  );
}
