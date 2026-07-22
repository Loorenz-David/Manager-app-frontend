import { CircleAlert, Upload } from "lucide-react";

type MediaUploadOverlayProps = {
  /** 0–100 while uploading. */
  progress: number;
  fileName?: string | null;
  onCancel: () => void;
  /** When set, the overlay switches to its error state. */
  errorMessage?: string | null;
  onRetry?: () => void;
  onDismissError: () => void;
};

/** Modal overlay over the editor while a media upload is in flight (or failed). */
export function MediaUploadOverlay({
  progress,
  fileName,
  onCancel,
  errorMessage,
  onRetry,
  onDismissError,
}: MediaUploadOverlayProps): React.JSX.Element {
  const isError = errorMessage != null;

  return (
    <div
      data-testid="presentation-editor-upload-overlay"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
    >
      <div className="w-[320px] rounded-xl border border-[#e7e7e7] bg-white p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.28)]">
        {isError ? (
          <>
            <div className="flex items-center gap-2">
              <CircleAlert aria-hidden className="size-4.5 shrink-0 text-[#c05a5a]" strokeWidth={2} />
              <p className="text-[13.5px] font-bold text-[#303030]">Upload failed</p>
            </div>
            <p className="mt-1.5 text-xs leading-4 text-[#767676]">{errorMessage}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onDismissError}
                data-testid="presentation-editor-upload-dismiss-button"
                className="rounded-lg border border-[#dcdcdc] bg-white px-3.5 py-[7px] text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f4f4f4]"
              >
                Dismiss
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  data-testid="presentation-editor-upload-retry-button"
                  className="rounded-lg bg-[#303030] px-3.5 py-[7px] text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#1c1c1c]"
                >
                  Try again
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Upload aria-hidden className="size-4.5 shrink-0 text-[#767676]" strokeWidth={2} />
              <p className="truncate text-[13.5px] font-bold text-[#303030]">
                {fileName ?? "Uploading media"}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
              <div
                data-testid="presentation-editor-upload-progress"
                className="h-full rounded-full bg-[#3f78a8] transition-[width] duration-200"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#9a9a9a]">
                {Math.round(Math.min(100, Math.max(0, progress)))}%
              </span>
              <button
                type="button"
                onClick={onCancel}
                data-testid="presentation-editor-upload-cancel-button"
                className="text-xs font-semibold text-[#767676] transition-colors duration-150 hover:text-[#c05a5a]"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
