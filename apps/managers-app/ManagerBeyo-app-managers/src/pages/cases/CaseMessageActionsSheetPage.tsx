import { useEffect, useState } from 'react';

import { ConfirmActionButton } from '@/components/primitives';
import { dispatchCaseMessageEditRequest } from '@/features/cases/lib/case-message-edit-events';
import {
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseMessageActionsSheetSurfaceProps,
} from '@/features/cases/surfaces';
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function CaseMessageActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const {
    canDelete = false,
    canEdit = false,
    messageClientId,
    messageSeq,
    messageText = '',
    onRequestDelete,
  } = useSurfaceProps<CaseMessageActionsSheetSurfaceProps>();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    header?.setTitle('Message');
    header?.setActions(null);
  }, [header]);

  const hasActions = canEdit || canDelete;

  return (
    <div
      className="flex flex-col gap-3 bg-background p-6"
      data-message-seq={typeof messageSeq === 'number' ? String(messageSeq) : undefined}
      data-testid="case-message-actions-sheet"
    >
      {!hasActions ? (
        <p className="text-sm text-muted-foreground">No actions are available for this message.</p>
      ) : null}

      {deleteError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {deleteError}
        </div>
      ) : null}

      {canEdit ? (
        <button
          className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
          data-testid="case-message-edit-button"
          onClick={(event) => {
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDeleteError(null);
            if (!messageClientId) {
              return;
            }

            dispatchCaseMessageEditRequest({
              messageClientId,
              messageSeq: typeof messageSeq === 'number' ? messageSeq : null,
              messageText,
            });
            surface.close(CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID);
          }}
          type="button"
        >
          Edit message
        </button>
      ) : null}

      {canDelete ? (
        <ConfirmActionButton
          className="w-full text-left"
          confirmLabel="Tap again to delete"
          data-testid="case-message-delete-button"
          label="Delete message"
          onConfirm={() => {
            setDeleteError(null);
            if (!onRequestDelete) {
              return;
            }

            void onRequestDelete().catch(() => {
              setDeleteError('Message could not be deleted.');
            });
          }}
        />
      ) : null}
    </div>
  );
}
