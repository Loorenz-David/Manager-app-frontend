import { ImagePreviewGrid, useEntityImagesContext } from "@beyo/images";

type TaskNoteImagesSectionProps = {
  testId?: string;
};

export function TaskNoteImagesSection({
  testId = "note-images-section",
}: TaskNoteImagesSectionProps): React.JSX.Element | null {
  const { images, isPending } = useEntityImagesContext();

  if (!isPending && images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">Note images</p>
      <ImagePreviewGrid
        hideAddButton
        maxImages={3}
        testId={`${testId}-grid`}
      />
    </div>
  );
}
