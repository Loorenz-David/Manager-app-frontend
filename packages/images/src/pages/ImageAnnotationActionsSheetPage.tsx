import { useSurfaceProps } from '@beyo/hooks';
import { useSurfaceStore } from '@beyo/ui';
import {
  IMAGE_ANNOTATION_ACTIONS_SURFACE_ID,
  type ImageAnnotationActionsSurfaceProps,
} from '../surfaces';

export function ImageAnnotationActionsSheetPage(): React.JSX.Element {
  const { item, onDelete, onEditText, onMoveText } =
    useSurfaceProps<ImageAnnotationActionsSurfaceProps>();
  const isText = item?.data.tool === 'text';

  function handleDelete(): void {
    onDelete?.();
    useSurfaceStore.getState().close(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID);
  }

  function handleEditText(): void {
    onEditText?.();
    useSurfaceStore.getState().close(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID);
  }

  function handleMoveText(): void {
    onMoveText?.();
    useSurfaceStore.getState().close(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID);
  }

  return (
    <div className="flex flex-col px-4 pb-6 pt-2">
      <button
        className="flex h-14 w-full items-center px-2 text-left text-base text-destructive"
        data-testid="annotation-action-delete"
        type="button"
        onClick={handleDelete}
      >
        {isText ? 'Delete text' : 'Delete shape'}
      </button>

      {isText ? (
        <>
          <button
            className="flex h-14 w-full items-center px-2 text-left text-base text-foreground"
            type="button"
            onClick={handleEditText}
          >
            Edit text
          </button>
          <button
            className="flex h-14 w-full items-center px-2 text-left text-base text-foreground"
            type="button"
            onClick={handleMoveText}
          >
            Move text
          </button>
        </>
      ) : null}
    </div>
  );
}
