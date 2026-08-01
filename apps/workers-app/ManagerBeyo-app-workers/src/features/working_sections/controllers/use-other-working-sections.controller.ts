import { useCallback, useMemo, useState } from "react";
import type { WorkingSectionId } from "@beyo/lib";

import { useWorkspaceWorkingSectionsQuery } from "../api/use-workspace-working-sections";
import {
  toWorkspaceWorkingSectionViewModel,
  type WorkingSectionViewModel,
} from "../types";

export type OtherWorkingSectionsController = {
  /** Workspace sections the caller is not a member of. Empty until expanded. */
  otherSections: WorkingSectionViewModel[];
  isExpanded: boolean;
  toggleExpanded: () => void;
  isPending: boolean;
  isError: boolean;
};

/**
 * The "show more" list on home: sections the worker can enter but is not
 * assigned to. Fetched only after the first expand so the default home render
 * stays a single request; once fetched the data is cached and re-expanding is
 * instant.
 */
export function useOtherWorkingSectionsController(
  mySectionIds: WorkingSectionId[],
): OtherWorkingSectionsController {
  const [isExpanded, setIsExpanded] = useState(false);
  const query = useWorkspaceWorkingSectionsQuery(isExpanded);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((expanded) => !expanded);
  }, []);

  const mySectionIdKey = mySectionIds.join(",");

  const otherSections = useMemo(() => {
    if (!query.data) return [];

    const mine = new Set(mySectionIdKey ? mySectionIdKey.split(",") : []);

    return query.data
      .filter((section) => !mine.has(section.client_id))
      .map(toWorkspaceWorkingSectionViewModel);
  }, [query.data, mySectionIdKey]);

  return {
    otherSections,
    isExpanded,
    toggleExpanded,
    isPending: isExpanded && query.isPending,
    isError: isExpanded && query.isError,
  };
}
