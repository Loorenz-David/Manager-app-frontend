import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

import { ParticipantPickerSlideContent } from "./ParticipantPickerSlideContent";

export function ParticipantPickerRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Select participants");
  }, [header]);

  return <ParticipantPickerSlideContent />;
}
