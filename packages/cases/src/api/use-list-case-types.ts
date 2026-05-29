import { useQuery } from "@tanstack/react-query";

import type { ListCaseTypesParams } from "../types";
import { caseTypeKeys } from "./case-type-keys";
import { listCaseTypes } from "./list-case-types";

export function useListCaseTypesQuery(params: ListCaseTypesParams = {}) {
  return useQuery({
    queryKey: caseTypeKeys.list(params),
    queryFn: () => listCaseTypes(params),
  });
}
