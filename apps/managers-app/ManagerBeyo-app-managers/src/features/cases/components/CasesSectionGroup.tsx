import type { CaseId } from "@/types/common";

import { CaseCard } from "./CaseCard";
import type { CasesGroup } from "../controllers/use-cases-view.controller";

type CasesSectionGroupProps = {
  group: CasesGroup;
  sectionTestId: string;
  unreadCounts: Record<string, number>;
  onOpenCase: (caseClientId: CaseId) => void;
};

export function CasesSectionGroup({
  group,
  sectionTestId,
  unreadCounts,
  onOpenCase,
}: CasesSectionGroupProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3" data-testid={sectionTestId}>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {group.label}
        </h2>
        <span className="rounded-full   text-xs font-medium text-muted-foreground">
          ( {group.count} )
        </span>
      </div>

      {group.cases.length > 0 ? (
        <div className="flex flex-col gap-3">
          {group.cases.map((card) => (
            <CaseCard
              key={card.client_id}
              card={card}
              unreadCount={unreadCounts[card.client_id] ?? 0}
              onOpen={onOpenCase}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-4 py-5 text-sm text-muted-foreground">
          No cases in this section.
        </div>
      )}
    </section>
  );
}
