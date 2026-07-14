import { EntityImagesProvider } from "@beyo/images";
import {
  TaskNoteComposer,
  TaskNoteImagesSection,
  type TaskNoteComposerValue,
} from "@beyo/task-notes";
import { ContentCard } from "@beyo/ui";

type TaskWorkingSectionsNoteStepProps = {
  noteClientId: string;
  noteDraft: TaskNoteComposerValue | null;
  onNoteChange: (value: TaskNoteComposerValue) => void;
};

export function TaskWorkingSectionsNoteStep({
  noteClientId,
  noteDraft,
  onNoteChange,
}: TaskWorkingSectionsNoteStepProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-4 px-3"
      data-testid="task-working-sections-reassign-note-step"
    >
      <EntityImagesProvider
        entityClientId={noteClientId}
        captureFlow="camera-to-editor"
        deleteMode="hard-delete"
        entityType="note"
      >
        <ContentCard>
          <TaskNoteComposer
            initialContent={noteDraft?.content}
            onChange={onNoteChange}
            placeholder="Add a note…"
            testId="task-working-sections-reassign-note-composer"
          />
          <TaskNoteImagesSection testId="task-working-sections-reassign-note-images" />
        </ContentCard>
      </EntityImagesProvider>
    </div>
  );
}
