import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@beyo/lib";

import { MediaStripe } from "../dashboard/MediaStripe";

type EditorCanvasProps = {
  /** The rendered slide content (runtime renderer). When absent, the placeholder shows. */
  children?: ReactNode;
  /** Placeholder pill text when the slide has no background media yet. */
  placeholderKind?: "IMAGE" | "VIDEO";
  onUploadClick: () => void;
  /** Files dropped onto the phone screen. */
  onFilesDropped: (files: File[]) => void;
  uploadDisabled?: boolean;
};

/** The centered phone canvas: 264×470 screen, dark bezel, drop/upload affordance. */
export function EditorCanvas({
  children,
  placeholderKind = "IMAGE",
  onUploadClick,
  onFilesDropped,
  uploadDisabled,
}: EditorCanvasProps): React.JSX.Element {
  const [isDropTarget, setIsDropTarget] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto p-8">
      <div
        data-testid="presentation-editor-canvas"
        onDragOver={(event) => {
          if (uploadDisabled) return;
          event.preventDefault();
          setIsDropTarget(true);
        }}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDropTarget(false);
          if (uploadDisabled) return;
          onFilesDropped(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "relative h-[470px] w-[264px] shrink-0 overflow-hidden rounded-[20px] border-4 border-[#1c1c1c] bg-[#474d56] shadow-[0_12px_34px_-14px_rgba(0,0,0,0.4)]",
          isDropTarget && "ring-4 ring-[#3f78a8]/40",
        )}
      >
        {children ?? (
          <div className="relative h-full w-full">
            <MediaStripe />
            <button
              type="button"
              onClick={onUploadClick}
              disabled={uploadDisabled}
              data-testid="presentation-editor-canvas-upload-button"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/85 transition-colors duration-150 hover:bg-black/10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed"
            >
              <span className="rounded-md bg-black/35 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide">
                {placeholderKind}
              </span>
              <span className="max-w-[180px] text-center text-xs leading-4 text-white/70">
                Drop or upload an image/video
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
