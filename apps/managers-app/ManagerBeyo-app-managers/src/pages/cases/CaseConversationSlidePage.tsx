import { useParams } from "react-router-dom";

import { CaseConversationRouteEntry } from "@beyo/cases";
import type { CaseConversationSurfaceProps } from "@beyo/cases";
import { useSurfaceProps } from "@/hooks/use-surface-props";

export function CaseConversationSlidePage(): React.JSX.Element {
  const params = useParams<{ caseId: string }>();
  const surfaceProps = useSurfaceProps<CaseConversationSurfaceProps>();
  const caseClientId = (params.caseId ?? surfaceProps.caseClientId) as
    | CaseConversationSurfaceProps["caseClientId"]
    | undefined;

  if (!caseClientId) {
    return (
      <div className="bg-background p-6 text-sm text-muted-foreground">
        Case id is missing.
      </div>
    );
  }

  return (
    <CaseConversationRouteEntry
      caseClientId={caseClientId}
      surfaceOpeners={surfaceProps.surfaceOpeners}
    />
  );
}
