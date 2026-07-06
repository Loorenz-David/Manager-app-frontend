import { useQuery } from "@tanstack/react-query";

import { getCustomerCoordinationCounts } from "./get-customer-coordination-counts";
import { customerCoordinationKeys } from "./customer-coordination-keys";

export function useCustomerCoordinationCountsQuery(
  customerCoordinationStates?: string,
) {
  return useQuery({
    queryKey: customerCoordinationKeys.counts(customerCoordinationStates),
    queryFn: () =>
      getCustomerCoordinationCounts({
        customer_coordination_states: customerCoordinationStates,
      }),
  });
}
