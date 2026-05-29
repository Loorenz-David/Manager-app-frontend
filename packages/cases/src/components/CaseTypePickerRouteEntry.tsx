import { useEffect } from "react";
import { useSurfaceHeader } from "@beyo/hooks";

import { CaseTypePickerSheetContent } from "./CaseTypePickerSheetContent";

export function CaseTypePickerRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Select case type");
  }, [header]);

  return <CaseTypePickerSheetContent />;
}
