import { ProtectedRoute as BaseProtectedRoute } from "@beyo/auth";
import { ROUTES } from "@/lib/routes";

export function ProtectedRoute(): React.JSX.Element {
  return <BaseProtectedRoute signInPath={ROUTES.signIn} />;
}
