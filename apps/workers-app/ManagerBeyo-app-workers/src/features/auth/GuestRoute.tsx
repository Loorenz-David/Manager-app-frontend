import { GuestRoute as BaseGuestRoute } from "@beyo/auth";
import { ROUTES } from "@/lib/routes";

export function GuestRoute(): React.JSX.Element {
  return <BaseGuestRoute homePath={ROUTES.home} />;
}
