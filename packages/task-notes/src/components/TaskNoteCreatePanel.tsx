import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EntityImagesProvider, useEntityImagesContext } from "@beyo/images";
import { generateClientId } from "@beyo/lib";
import { VerticalScrollArea } from "@beyo/ui";

import { useCreateTaskNote } from "../api/use-create-task-note";
import {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
} from "../lib/task-note-serialization";
import type { TaskNoteComposerValue } from "../types";
import { TaskNoteComposer } from "./TaskNoteComposer";
import { TaskNoteImagesSection } from "./TaskNoteImagesSection";

const EMPTY_COMPOSER_VALUE: TaskNoteComposerValue = {
  content: { parts: [] },
  plainText: "",
};

type TaskNoteCreatePanelProps = {
  currentUserId: string | null;
  taskId: string;
  onBack: () => void;
  onRequestClose: () => void;
};

export function TaskNoteCreatePanel({
  currentUserId,
  taskId,
  onBack,
  onRequestClose,
}: TaskNoteCreatePanelProps): React.JSX.Element {
  const [draftNoteId] = useState(() => generateClientId("TaskNote"));

  return (
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      deleteMode="hard-delete"
      entityClientId={draftNoteId}
      entityType="note"
    >
      <TaskNoteCreatePanelBody
        currentUserId={currentUserId}
        draftNoteId={draftNoteId}
        taskId={taskId}
        onBack={onBack}
        onRequestClose={onRequestClose}
      />
    </EntityImagesProvider>
  );
}

type TaskNoteCreatePanelBodyProps = {
  currentUserId: string | null;
  draftNoteId: string;
  taskId: string;
  onBack: () => void;
  onRequestClose: () => void;
};

function TaskNoteCreatePanelBody({
  currentUserId,
  draftNoteId,
  taskId,
  onBack,
  onRequestClose,
}: TaskNoteCreatePanelBodyProps): React.JSX.Element {
  const createNote = useCreateTaskNote();
  const { images } = useEntityImagesContext();
  const [value, setValue] =
    useState<TaskNoteComposerValue>(EMPTY_COMPOSER_VALUE);
  const canSave = hasMeaningfulNoteContent(value) || images.length > 0;

  function handleSave(): void {
    if (!canSave) {
      return;
    }

    createNote.mutate({
      taskId,
      notes: [
        {
          client_id: draftNoteId,
          note_type: "user_note",
          content: toTaskNoteContentBlocks(value.content),
          plain_text: value.plainText,
          users_read_list: currentUserId ? [currentUserId] : [],
        },
      ],
    });
    onRequestClose();
  }

  return (
    <div className="flex h-full flex-col gap-4" data-testid="task-note-create-panel">
      <div className="flex items-center justify-between gap-3">
        <button
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-notes-create-back-button"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <VerticalScrollArea className="h-full pr-3">
          <div className="flex flex-col gap-4">
            <TaskNoteComposer
              onChange={setValue}
              placeholder="Write a note..."
              testId="task-note-create-composer"
            />
            <TaskNoteImagesSection />
          </div>
        </VerticalScrollArea>
      </div>

      <button
        className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="task-note-save-button"
        disabled={!canSave || createNote.isPending}
        type="button"
        onClick={handleSave}
      >
        Save note
      </button>
    </div>
  );
}
