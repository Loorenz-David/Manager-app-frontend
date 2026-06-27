import { useEffect, useState } from "react";
import { ChevronLeft, SquarePen } from "lucide-react";
import { EntityImagesProvider, useEntityImagesContext } from "@beyo/images";
import { ContentCard, VerticalScrollArea } from "@beyo/ui";

import { useUpdateTaskNote } from "../api/use-update-task-note";
import {
  fromBackendNoteContent,
  hasMeaningfulNoteContent,
  plainTextToComposerContent,
  toTaskNoteContentBlocks,
} from "../lib/task-note-serialization";
import type { TaskNoteApiEntry, TaskNoteComposerValue } from "../types";
import { TaskNoteComposer } from "./TaskNoteComposer";
import { TaskNoteContentView } from "./TaskNoteContentView";
import { TaskNoteImagesSection } from "./TaskNoteImagesSection";
import { TaskNoteReadonlyImages } from "./TaskNoteReadonlyImages";

type TaskNoteDetailPanelProps = {
  canEdit: boolean;
  entry: TaskNoteApiEntry;
  taskId: string;
  onBack: () => void;
  onOpenViewer: (imageClientId: string) => void;
  onRequestClose: () => void;
};

export function TaskNoteDetailPanel({
  canEdit,
  entry,
  taskId,
  onBack,
  onOpenViewer,
  onRequestClose,
}: TaskNoteDetailPanelProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [entry.note.client_id]);

  return (
    <div
      className="flex h-full flex-col gap-4"
      data-testid="task-note-detail-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-notes-detail-back-button"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-4 d" />
          Back
        </button>

        {canEdit && !isEditing ? (
          <button
            className="rounded-full p-2 text-icon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            data-testid="task-notes-edit-button"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            <SquarePen aria-hidden="true" className="size-5 " />
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <TaskNoteEditPanelBody
          entry={entry}
          taskId={taskId}
          onRequestClose={onRequestClose}
        />
      ) : (
        <TaskNoteDetailReadonlyBody entry={entry} onOpenViewer={onOpenViewer} />
      )}
    </div>
  );
}

type TaskNoteDetailReadonlyBodyProps = {
  entry: TaskNoteApiEntry;
  onOpenViewer: (imageClientId: string) => void;
};

function TaskNoteDetailReadonlyBody({
  entry,
  onOpenViewer,
}: TaskNoteDetailReadonlyBodyProps): React.JSX.Element {
  return (
    <div className="min-h-0 flex-1">
      <VerticalScrollArea
        className="h-full pr-3"
        data-testid="task-note-detail-scroll-area"
        style={{ height: "100%" }}
      >
        <ContentCard gapClassName="gap-4">
          <TaskNoteContentView
            content={entry.note.content}
            plainText={entry.note.plain_text}
          />
          {entry.note_images.length > 0 ? (
            <TaskNoteReadonlyImages
              images={entry.note_images}
              onOpen={onOpenViewer}
            />
          ) : null}
        </ContentCard>
      </VerticalScrollArea>
    </div>
  );
}

type TaskNoteEditPanelBodyProps = {
  entry: TaskNoteApiEntry;
  taskId: string;
  onRequestClose: () => void;
};

function TaskNoteEditPanelBody({
  entry,
  taskId,
  onRequestClose,
}: TaskNoteEditPanelBodyProps): React.JSX.Element {
  return (
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      deleteMode="hard-delete"
      entityClientId={entry.note.client_id}
      entityType="note"
    >
      <TaskNoteEditPanelBodyInner
        entry={entry}
        taskId={taskId}
        onRequestClose={onRequestClose}
      />
    </EntityImagesProvider>
  );
}

type TaskNoteEditPanelBodyInnerProps = {
  entry: TaskNoteApiEntry;
  taskId: string;
  onRequestClose: () => void;
};

function TaskNoteEditPanelBodyInner({
  entry,
  taskId,
  onRequestClose,
}: TaskNoteEditPanelBodyInnerProps): React.JSX.Element {
  const updateNote = useUpdateTaskNote();
  const { images } = useEntityImagesContext();
  const initialContent = getInitialComposerContent(entry);
  const [value, setValue] = useState<TaskNoteComposerValue>(() => ({
    content: initialContent,
    plainText: entry.note.plain_text,
  }));
  const canSave = hasMeaningfulNoteContent(value) || images.length > 0;

  useEffect(() => {
    setValue({
      content: getInitialComposerContent(entry),
      plainText: entry.note.plain_text,
    });
  }, [entry]);

  function handleSubmit(): void {
    if (!canSave) {
      return;
    }

    updateNote.mutate({
      taskId,
      noteId: entry.note.client_id,
      content: toTaskNoteContentBlocks(value.content),
      plain_text: value.plainText,
    });
    onRequestClose();
  }

  return (
    <div className="min-h-0 flex-1">
      <VerticalScrollArea className="h-full pr-3">
        <div className="flex flex-col gap-4">
          <TaskNoteComposer
            initialContent={initialContent}
            onChange={setValue}
            onCheckDone={handleSubmit}
            placeholder="Edit note..."
            testId="task-note-edit-composer"
          />
          <TaskNoteImagesSection />
          {!canSave ? (
            <p className="text-sm text-muted-foreground">
              Add text or note images to save this note.
            </p>
          ) : null}
        </div>
      </VerticalScrollArea>
    </div>
  );
}

function getInitialComposerContent(entry: TaskNoteApiEntry) {
  if (entry.note.content.length > 0) {
    return fromBackendNoteContent(entry.note.content);
  }

  return plainTextToComposerContent(entry.note.plain_text);
}
