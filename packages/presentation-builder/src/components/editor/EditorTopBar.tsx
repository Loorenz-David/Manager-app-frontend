import { ChevronLeft, Play } from "lucide-react";
import { useState } from "react";

import { cn } from "@beyo/lib";

import { AnnouncementStatusPill } from "../dashboard/AnnouncementStatusPill";
import type { AnnouncementDisplayStatus } from "../dashboard/types";

type EditorTopBarProps = {
  title: string;
  /** Live text change while editing the title. */
  onTitleChange: (value: string) => void;
  /** Fired on blur/Enter with the final value — the moment to persist. */
  onTitleCommit: (value: string) => void;
  titleReadOnly?: boolean;
  status: AnnouncementDisplayStatus;
  onBack: () => void;
  onPreview: () => void;
  previewDisabled?: boolean;
  onSaveDraft: () => void;
  saveDraftDisabled?: boolean;
  /** e.g. "Save draft" normally, "Saving…" while flushing, "Saved" when clean. */
  saveDraftLabel?: string;
  onPublish: () => void;
  publishDisabled?: boolean;
};

const GHOST_BUTTON_CLASS =
  "flex items-center gap-1.5 rounded-lg border border-[#dcdcdc] bg-white px-3.5 py-[7px] text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50";

export function EditorTopBar({
  title,
  onTitleChange,
  onTitleCommit,
  titleReadOnly,
  status,
  onBack,
  onPreview,
  previewDisabled,
  onSaveDraft,
  saveDraftDisabled,
  saveDraftLabel = "Save draft",
  onPublish,
  publishDisabled,
}: EditorTopBarProps): React.JSX.Element {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  return (
    <header
      data-testid="presentation-editor-top-bar"
      className="flex h-[54px] shrink-0 items-center justify-between gap-4 border-b border-[#e7e7e7] bg-white px-3.5"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to announcements"
          data-testid="presentation-editor-back-button"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#767676] transition-colors duration-150 hover:bg-[#f4f4f4] hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
        >
          <ChevronLeft aria-hidden className="size-4.5" strokeWidth={2} />
        </button>
        {titleReadOnly ? (
          <span className="truncate text-[14.5px] font-bold text-[#303030]">{title}</span>
        ) : (
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onFocus={() => setIsEditingTitle(true)}
            onBlur={(event) => {
              setIsEditingTitle(false);
              onTitleCommit(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            aria-label="Announcement title"
            data-testid="presentation-editor-title-input"
            className={cn(
              "w-[260px] truncate rounded-md border border-transparent px-1.5 py-1 text-[14.5px] font-bold text-[#303030] transition-colors duration-150 focus:outline-none",
              isEditingTitle
                ? "border-[#dcdcdc] bg-white"
                : "hover:border-[#e7e7e7] hover:bg-[#fafafa]",
            )}
          />
        )}
        <AnnouncementStatusPill status={status} className="shrink-0" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onPreview}
          disabled={previewDisabled}
          data-testid="presentation-editor-preview-button"
          className={GHOST_BUTTON_CLASS}
        >
          <Play aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
          Preview
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saveDraftDisabled}
          data-testid="presentation-editor-save-draft-button"
          className={GHOST_BUTTON_CLASS}
        >
          {saveDraftLabel}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishDisabled}
          data-testid="presentation-editor-publish-button"
          className="rounded-lg bg-[#303030] px-4 py-[7px] text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#1c1c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publish
        </button>
      </div>
    </header>
  );
}
