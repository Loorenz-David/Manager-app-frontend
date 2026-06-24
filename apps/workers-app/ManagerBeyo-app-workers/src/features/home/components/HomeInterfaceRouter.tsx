import { useRole } from "@beyo/auth";
import { homeInterfaceRegistry } from "../home-interface-registry";

export function HomeInterfaceRouter(): React.JSX.Element {
  const { workspaceRoleName } = useRole();
  const Interface =
    homeInterfaceRegistry[workspaceRoleName ?? "default"] ??
    homeInterfaceRegistry.default;

  return <Interface />;
}
