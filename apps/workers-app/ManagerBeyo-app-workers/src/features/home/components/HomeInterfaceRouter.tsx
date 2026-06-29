import { useRole } from "@beyo/auth";
import { homeInterfaceRegistry } from "../home-interface-registry";

export function HomeInterfaceRouter(): React.JSX.Element {
  const { workspaceSpecialization } = useRole();
  const Interface =
    homeInterfaceRegistry[workspaceSpecialization ?? "default"] ??
    homeInterfaceRegistry.default;

  return <Interface />;
}
