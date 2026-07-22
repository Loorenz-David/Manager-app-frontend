import { BackendImage } from "@beyo/ui";

import { MediaStripe } from "./MediaStripe";
import type { AnnouncementMediaKind } from "./types";

type MiniPhoneCoverProps = {
  mediaKinds: AnnouncementMediaKind[];
  coverImageUrl?: string | null;
  onCoverError?: () => void;
};

/** The 88×156 phone miniature centered on a card cover. */
export function MiniPhoneCover({
  mediaKinds,
  coverImageUrl,
  onCoverError,
}: MiniPhoneCoverProps): React.JSX.Element {
  return (
    <div className="relative h-[156px] w-[88px] shrink-0 overflow-hidden rounded-[13px] border-[3px] border-[#1c1c1c] bg-[#474d56]">
      <BackendImage
        src={coverImageUrl ?? null}
        alt=""
        className="h-full w-full object-cover"
        fallback={<MediaStripe />}
        onError={onCoverError}
      />
      {mediaKinds.length > 0 && (
        <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 px-1">
          {mediaKinds.map((kind, index) => (
            <span
              key={`${kind}-${index}`}
              className="rounded-[4px] bg-black/35 px-1 py-px font-mono text-[9px] font-medium uppercase leading-[13px] text-white"
            >
              {kind === "video" ? "VIDEO" : "IMG"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
