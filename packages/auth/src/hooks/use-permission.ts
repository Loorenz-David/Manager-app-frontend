import { usePermissions } from "./use-permissions";

export function usePermission<TKey extends string = string>(key: TKey): boolean {
  return usePermissions<TKey>().can(key);
}
