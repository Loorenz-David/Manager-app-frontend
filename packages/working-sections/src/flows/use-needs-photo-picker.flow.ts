import { useMemo } from "react";

import type { WorkingSectionShortcutCandidate } from "../types";
import { useWorkingSectionPickerFlow } from "./use-working-section-picker.flow";

function createCandidates(
  sectionNameMatcher: (sectionName: string) => boolean,
  options: ReturnType<typeof useWorkingSectionPickerFlow>["options"],
): WorkingSectionShortcutCandidate[] {
  const seen = new Set<string>();
  return options.flatMap((section) => {
    if (!sectionNameMatcher(section.name.toLowerCase())) return [];
    return section.members.reduce<WorkingSectionShortcutCandidate[]>(
      (acc, member) => {
        if (!seen.has(member.client_id)) {
          seen.add(member.client_id);
          acc.push({ workingSectionId: section.client_id, member });
        }
        return acc;
      },
      [],
    );
  });
}

export function useNeedsPhotoPickerFlow() {
  const flow = useWorkingSectionPickerFlow();

  const sections = useMemo(
    () => flow.options.filter((s) => s.name.toLowerCase().includes("photography")),
    [flow.options],
  );

  const candidates = useMemo(
    () =>
      createCandidates(
        (sectionName) => sectionName.includes("photography"),
        flow.options,
      ),
    [flow.options],
  );

  return {
    sections,
    candidates,
    members: candidates.map((candidate) => candidate.member),
    isLoading: flow.isLoading,
  };
}
