import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
import { SectionLabel } from "@beyo/ui";

type TaskImagesSectionProps = {
  itemId: string | null;
  onImagesChanged: () => void;
};

export function TaskImagesSection({
  itemId,
  onImagesChanged,
}: TaskImagesSectionProps): React.JSX.Element {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <SectionLabel as="h3" tone="muted">
        Images
      </SectionLabel>
      {itemId ? (
        <EntityImagesProvider
          entityClientId={itemId}
          captureFlow="camera-to-editor"
          deleteMode="hard-delete"
          entityType="item"
          onImagesChanged={onImagesChanged}
        >
          <ImagePreviewGrid />
        </EntityImagesProvider>
      ) : (
        <p className="text-sm text-muted-foreground">
          No item is linked to this task.
        </p>
      )}
    </div>
  );
}
