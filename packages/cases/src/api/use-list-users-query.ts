import { useQuery } from "@tanstack/react-query";

import type { ListUsersParams } from "../types";
import { listUsers } from "./list-users";
import { userKeys } from "./user-keys";

export function useListUsersQuery(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
  });
}
