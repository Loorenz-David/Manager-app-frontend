import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { CaseCreationFormProvider } from "../providers/CaseCreationFormProvider";
import type { CaseCreationSlideSurfaceProps } from "../surface-ids";
import { CaseCreationFormContent } from "./CaseCreationFormContent";

export function CaseCreationRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { entityTypes, surfaceOpeners } =
    useSurfaceProps<CaseCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setTitle("New case");
  }, [header]);

  return (
    <CaseCreationFormProvider
      entityTypes={entityTypes}
      surfaceOpeners={surfaceOpeners}
    >
      <CaseCreationFormContent />
    </CaseCreationFormProvider>
  );
}
