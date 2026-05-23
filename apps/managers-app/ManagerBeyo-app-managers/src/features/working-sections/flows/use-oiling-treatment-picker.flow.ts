import { useMemo } from 'react';

import type { WorkingSectionShortcutCandidate } from '../types';
import { useWorkingSectionPickerFlow } from './use-working-section-picker.flow';

function createCandidates(
  options: ReturnType<typeof useWorkingSectionPickerFlow>['options'],
): WorkingSectionShortcutCandidate[] {
  const seen = new Set<string>();
  return options.flatMap((section) => {
    const sectionName = section.name.toLowerCase();
    const matches =
      sectionName.includes('hardwax oil') || sectionName.includes('ground oil');

    if (!matches) return [];
    return section.members.reduce<WorkingSectionShortcutCandidate[]>((acc, member) => {
      if (!seen.has(member.client_id)) {
        seen.add(member.client_id);
        acc.push({ workingSectionId: section.client_id, member });
      }
      return acc;
    }, []);
  });
}

export function useOilingTreatmentPickerFlow() {
  const flow = useWorkingSectionPickerFlow();

  const sections = useMemo(
    () =>
      flow.options.filter((s) => {
        const name = s.name.toLowerCase();
        return name.includes('hardwax oil') || name.includes('ground oil');
      }),
    [flow.options],
  );

  const candidates = useMemo(() => createCandidates(flow.options), [flow.options]);

  return {
    sections,
    candidates,
    members: candidates.map((candidate) => candidate.member),
    isLoading: flow.isLoading,
  };
}
