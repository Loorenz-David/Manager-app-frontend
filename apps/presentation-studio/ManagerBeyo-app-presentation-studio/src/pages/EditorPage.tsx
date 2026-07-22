import { EditorView } from "@beyo/presentation-builder";
import { useNavigate, useParams } from "react-router-dom";

import { ROUTES } from "@/lib/routes";

export function EditorPage(): React.JSX.Element {
  const { presentationId } = useParams<{ presentationId: string }>();
  const navigate = useNavigate();

  if (!presentationId) return <div data-testid="presentation-editor-missing-id" />;

  return (
    <EditorView
      presentationId={presentationId}
      onBack={() => navigate(ROUTES.home)}
      onPresentationIdChange={(nextId) => navigate(ROUTES.editor(nextId), { replace: true })}
    />
  );
}
