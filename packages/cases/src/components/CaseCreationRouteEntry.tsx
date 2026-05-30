import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { CaseCreationFormProvider } from "../providers/CaseCreationFormProvider";
import type { CaseCreationSlideSurfaceProps } from "../surface-ids";
import { CaseCreationFormContent } from "./CaseCreationFormContent";

export function CaseCreationRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { entityTypes, entityClientId, title, surfaceOpeners } =
    useSurfaceProps<CaseCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setTitle(title ? `Case for ${title}` : "New case");
  }, [header, title]);

  return (
    <CaseCreationFormProvider
      entityTypes={entityTypes}
      entityClientId={entityClientId}
      surfaceOpeners={surfaceOpeners}
    >
      <CaseCreationFormContent />
    </CaseCreationFormProvider>
  );
}
