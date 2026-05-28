import { useSurfaceProps } from '@beyo/hooks';
import type { ImageEditorDiscardChangesSurfaceProps } from '../surfaces';

export function ImageEditorDiscardChangesSheetPage(): React.JSX.Element {
  const { onDiscardAndClose, onSaveAndClose } =
    useSurfaceProps<ImageEditorDiscardChangesSurfaceProps>();

  return (
    <div className="flex flex-col px-4 pb-4 pt-2" data-testid="image-editor-discard-sheet">
      <p className="mb-4 px-2 text-sm text-muted-foreground" data-testid="discard-sheet-message">
        You have unsaved annotations. If you close now, they will be lost.
      </p>

      <button
        aria-label="Save annotations and close"
        className="mb-2 flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-sm font-medium text-background transition-opacity duration-150 hover:opacity-90"
        data-testid="discard-sheet-save-button"
        type="button"
        onClick={onSaveAndClose}
      >
        Save
      </button>

      <button
        aria-label="Discard annotations and close"
        className="flex h-12 w-full items-center justify-center rounded-2xl border border-border text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
        data-testid="discard-sheet-discard-button"
        type="button"
        onClick={onDiscardAndClose}
      >
        Close anyway
      </button>
    </div>
  );
}
