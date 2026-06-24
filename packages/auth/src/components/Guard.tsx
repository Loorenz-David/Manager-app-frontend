import type { ReactNode } from "react";
import { usePermission } from "../hooks/use-permission";

type GuardProps = {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
};

export function Guard({
  permission,
  fallback = null,
  children,
}: GuardProps): React.JSX.Element {
  return usePermission(permission) ? <>{children}</> : <>{fallback}</>;
}
