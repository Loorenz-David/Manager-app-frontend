import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  listPresentationUsers,
  type ListPresentationUsersParams,
} from "./list-users";
import { presentationUserKeys } from "./presentation-keys";

export function usePresentationUsers(params: ListPresentationUsersParams = {}) {
  return useQuery({
    queryKey: presentationUserKeys.list(params),
    queryFn: () => listPresentationUsers(params),
    placeholderData: keepPreviousData,
  });
}
