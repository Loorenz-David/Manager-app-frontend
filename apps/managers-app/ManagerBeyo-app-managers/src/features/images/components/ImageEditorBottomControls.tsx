import { Check, ChevronUp, Undo2, X } from 'lucide-react';

import { TOOLS } from './ImageAnnotationToolbar';
import type { ImageAnnotationTool } from '../types';

type ImageEditorBottomControlsProps = {
  activeTool: ImageAnnotationTool;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  canUndo: boolean;
  onClose: () => void;
  onDone: () => void;
  onOpenToolPicker: () => void;
  onUndo: () => void;
};

export function ImageEditorBottomControls({
  activeTool,
  hasUnsavedChanges,
  isSaving,
  canUndo,
  onClose,
  onDone,
  onOpenToolPicker,
  onUndo,
}: ImageEditorBottomControlsProps): React.JSX.Element {
  const currentToolDef = TOOLS.find((tool) => tool.type === activeTool);
  const ToolIcon = currentToolDef?.icon;

  return (
    <div
      className="pointer-events-none px-4 pb-[calc(var(--safe-bottom)+1rem)] pt-3"
      data-testid="image-editor-bottom-controls"
    >
      <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-black/70 px-3 py-3 backdrop-blur-md">
        <button
          aria-label="Close editor"
          className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors duration-150 hover:bg-white/14"
          data-testid="image-editor-close-button"
          type="button"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            aria-label="Undo last annotation"
            className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors duration-150 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="image-editor-undo-button"
            disabled={!canUndo}
            type="button"
            onClick={onUndo}
          >
            <Undo2 className="size-4" />
          </button>

          <button
            aria-label={`Current tool: ${currentToolDef?.label ?? activeTool}. Tap to change.`}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 text-sm text-white transition-colors duration-150 hover:bg-white/14"
            data-testid="image-editor-tool-trigger"
            type="button"
            onClick={onOpenToolPicker}
          >
            {ToolIcon ? <ToolIcon className="size-4" /> : null}
            <span>{currentToolDef?.label ?? activeTool}</span>
            <ChevronUp className="size-4 text-white/60" />
          </button>
        </div>

        <button
          aria-label={hasUnsavedChanges ? 'Save annotations' : 'Close editor'}
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-black transition-opacity duration-150 disabled:opacity-40"
          data-testid="image-editor-done-button"
          disabled={isSaving}
          type="button"
          onClick={onDone}
        >
          <Check className="size-5" />
        </button>
      </div>
    </div>
  );
}
