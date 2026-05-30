import type { QueryClient } from "@tanstack/react-query";
import type { CaseId } from "@beyo/lib";

import { DEFAULT_CASES_FILTER } from "../types";
import { caseKeys } from "./case-keys";
import { getCase } from "./get-case";
import { listCases } from "./list-cases";

export async function prefetchCasesData(
  queryClient: QueryClient,
  caseIds: string[],
): Promise<void> {
  await Promise.all(
    caseIds.map((id) => {
      const caseId = id as CaseId;
      return queryClient.prefetchQuery({
        queryKey: caseKeys.detail(caseId),
        queryFn: () => getCase({ case_client_id: caseId }),
        staleTime: 30_000,
      });
    }),
  );
}

export async function prefetchCasesListData(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  const params = {
    case_state: DEFAULT_CASES_FILTER.caseStates.join(","),
    includes_participants: userId,
  };
  await queryClient.prefetchQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => listCases(params),
  });
}
