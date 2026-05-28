import { useParams } from "react-router-dom";

import {
  CaseConversationRouteEntry,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";
import { useSurfaceProps } from "@beyo/hooks";
import type { CaseId } from "@beyo/lib";

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

  return <CaseConversationRouteEntry caseClientId={caseClientId as CaseId} />;
}
