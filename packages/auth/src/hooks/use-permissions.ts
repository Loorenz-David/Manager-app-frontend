import { useCallback, useMemo } from "react";
import { useAuthStore } from "../store/auth.store";

export function usePermissions<TKey extends string = string>() {
  const permissions = useAuthStore(
    (state) => state.user?.backend_permissions ?? [],
  );
  const permissionSet = useMemo(() => new Set<string>(permissions), [
    permissions,
  ]);
  const can = useCallback(
    (key: TKey): boolean => permissionSet.has(key),
    [permissionSet],
  );

  return { can };
}
