import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type PublishDialogShellProps = {
  /** Dialog body: audience + settings + schedule sections. */
  children: ReactNode;
  onClose: () => void;
  onPublish: () => void;
  publishDisabled?: boolean;
  isPublishing?: boolean;
  /** General (non-field) error summary, e.g. mapped 422 publish causes. */
  errorSummary?: ReactNode;
};

/** Desktop modal chrome for the publish flow (decision #4: metadata lives here). */
export function PublishDialogShell({
  children,
  onClose,
  onPublish,
  publishDisabled,
  isPublishing,
  errorSummary,
}: PublishDialogShellProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on open so keyboard/AT users land inside it.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      data-testid="presentation-publish-dialog"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Publish announcement"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex max-h-full w-[520px] flex-col overflow-hidden rounded-xl border border-[#e7e7e7] bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.4)] focus:outline-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#ececec] px-5 py-3.5">
          <p className="text-[14.5px] font-bold text-[#303030]">Publish announcement</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="presentation-publish-close-button"
            className="flex size-7 items-center justify-center rounded-md text-[#9a9a9a] transition-colors duration-150 hover:bg-[#f4f4f4] hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {errorSummary && (
          <div className="shrink-0 border-t border-[#f0e2c0] bg-[#fdf6e7] px-5 py-3">
            {errorSummary}
          </div>
        )}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#ececec] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            data-testid="presentation-publish-cancel-button"
            className="rounded-lg border border-[#dcdcdc] bg-white px-4 py-[8px] text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishDisabled || isPublishing}
            data-testid="presentation-publish-confirm-button"
            className="rounded-lg bg-[#303030] px-4 py-[8px] text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#1c1c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Section wrapper inside the dialog body. */
export function PublishDialogSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className="mt-5 first:mt-0">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
        {title}
      </p>
      {children}
    </section>
  );
}
