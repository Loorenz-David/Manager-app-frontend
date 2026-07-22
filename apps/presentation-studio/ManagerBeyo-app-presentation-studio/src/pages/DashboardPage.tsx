import { useAuth } from "@beyo/auth";
import { DashboardView } from "@beyo/presentation-builder";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/lib/routes";

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user, workspaceId } = useAuth();
  const navigateToEditor = useCallback(
    (presentationId: string) => navigate(ROUTES.editor(presentationId)),
    [navigate],
  );

  return (
    <DashboardView
      navigateToEditor={navigateToEditor}
      workspaceName={user?.workspaceName ?? workspaceId ?? "Workspace"}
      userName={user?.username ?? user?.email ?? "User"}
    />
  );
}
