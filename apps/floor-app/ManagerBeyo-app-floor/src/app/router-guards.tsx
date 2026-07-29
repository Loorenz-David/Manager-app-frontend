import { GuestRoute, ProtectedRoute } from "@beyo/auth";

import { ROUTES } from "@/lib/routes";

export function FloorGuestRoute(): React.JSX.Element {
  return <GuestRoute homePath={ROUTES.home} />;
}

export function FloorProtectedRoute(): React.JSX.Element {
  return <ProtectedRoute signInPath={ROUTES.signIn} />;
}
