import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useAuth } from "@beyo/auth";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { IMAGE_VIEWER_SURFACE_ID } from "@beyo/images";
import { cn } from "@beyo/lib";
import {
  ContentCard,
  ScrollVisibilityProvider,
  UserPill,
  useScrollVisibilityContext,
} from "@beyo/ui";

import { useMarkTaskNoteReadBy } from "../api/use-mark-task-note-read-by";
import { useTaskNotesQuery } from "../api/use-task-notes-query";
import { TaskNoteContentView } from "../components/TaskNoteContentView";
import {
  TaskNoteReadonlyImages,
  toTaskNoteViewerImages,
} from "../components/TaskNoteReadonlyImages";
import type { TaskNoteApiEntry } from "../types";
import type { TaskNoteUnreadViewerSurfaceProps } from "../surface-ids";

const NOTES_PANEL_HEIGHT = 400;

function formatNoteTime(createdAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

export function TaskNoteUnreadViewerPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { user } = useAuth();
  const { taskId } = useSurfaceProps<TaskNoteUnreadViewerSurfaceProps>();
  const notesQuery = useTaskNotesQuery(taskId);
  const markReadBy = useMarkTaskNoteReadBy();

  useEffect(() => {
    console.log("[TaskNoteUnreadViewerPage] notesQuery.data changed", {
      taskId,
      count: notesQuery.data?.length ?? null,
      isPending: notesQuery.isPending,
      isFetching: notesQuery.isFetching,
    });
  }, [notesQuery.data, notesQuery.isPending, notesQuery.isFetching, taskId]);
  const [lockedEntries, setLockedEntries] = useState<TaskNoteApiEntry[] | null>(
    null,
  );
  const hasLockedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(
    new Set(),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
  });
  const slideRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [activeScrollElement, setActiveScrollElement] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    if (hasLockedRef.current || notesQuery.isPending || !user?.id) {
      return;
    }

    const unread = (notesQuery.data ?? []).filter(
      (entry) => !entry.note.users_read_list.includes(user.id),
    );

    hasLockedRef.current = true;
    setLockedEntries(unread);
  }, [notesQuery.data, notesQuery.isPending, user?.id]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const syncIndex = () => {
      setActiveIndex(emblaApi.selectedScrollSnap());
    };

    syncIndex();
    emblaApi.on("select", syncIndex);

    return () => {
      emblaApi.off("select", syncIndex);
    };
  }, [emblaApi]);

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  useEffect(() => {
    if (
      lockedEntries &&
      lockedEntries.length > 0 &&
      acknowledgedIds.size >= lockedEntries.length
    ) {
      header?.requestClose();
    }
  }, [acknowledgedIds.size, header, lockedEntries]);

  const handleGotIt = useCallback(() => {
    if (!taskId || !user?.id || markReadBy.isPending || !lockedEntries) {
      return;
    }

    const current = lockedEntries[activeIndex];
    if (!current) {
      return;
    }

    const noteId = current.note.client_id;

    if (acknowledgedIds.has(noteId)) {
      if (activeIndex < lockedEntries.length - 1) {
        emblaApi?.scrollTo(activeIndex + 1);
      }
      return;
    }

    markReadBy.mutate({ taskId, noteId, userIds: [user.id] });
    setAcknowledgedIds((previous) => new Set([...previous, noteId]));

    if (activeIndex < lockedEntries.length - 1) {
      emblaApi?.scrollTo(activeIndex + 1);
    }
  }, [
    acknowledgedIds,
    activeIndex,
    emblaApi,
    lockedEntries,
    markReadBy,
    taskId,
    user?.id,
  ]);

  const handleOpenImageViewer = useCallback(
    (entry: TaskNoteApiEntry, imageClientId: string) => {
      surface.open(IMAGE_VIEWER_SURFACE_ID, {
        images: toTaskNoteViewerImages(entry),
        initialImageClientId: imageClientId,
        entityType: "note",
        entityClientId: entry.note.client_id,
        mode: "preview-only",
        enableOnDemandImageLoad: false,
      });
    },
    [surface],
  );

  const activeEntry =
    lockedEntries?.[activeIndex] ?? lockedEntries?.[0] ?? null;

  useEffect(() => {
    if (!activeEntry) {
      setActiveScrollElement(null);
      return;
    }

    setActiveScrollElement(
      slideRefs.current.get(activeEntry.note.client_id) ?? null,
    );
  }, [activeEntry]);

  if (!taskId) {
    return (
      <div
        className="p-4 text-sm text-muted-foreground"
        data-testid="task-note-unread-viewer"
      >
        Task id is missing.
      </div>
    );
  }

  if (notesQuery.isPending) {
    return (
      <div
        className="flex min-h-80 items-center justify-center p-4 text-sm text-muted-foreground"
        data-testid="task-note-unread-viewer"
      >
        Loading notes...
      </div>
    );
  }

  if (lockedEntries === null) {
    return (
      <div
        className="flex min-h-80 items-center justify-center p-4 text-sm text-muted-foreground"
        data-testid="task-note-unread-viewer"
      >
        Loading notes...
      </div>
    );
  }

  if (lockedEntries.length === 0) {
    return (
      <div
        className="flex min-h-80 items-center justify-center p-4 text-sm text-muted-foreground"
        data-testid="task-note-unread-viewer"
      >
        No unread notes.
      </div>
    );
  }

  return (
    <ScrollVisibilityProvider
      mode="relative"
      scrollElement={activeScrollElement}
      threshold={16}
    >
      <div
        className="relative bg-background"
        data-testid="task-note-unread-viewer"
        style={{ height: NOTES_PANEL_HEIGHT }}
      >
        <div className="h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {lockedEntries.map((entry) => (
              <div
                key={entry.note.client_id}
                ref={(element) => {
                  slideRefs.current.set(entry.note.client_id, element);
                }}
                className="min-w-0 flex-[0_0_100%] overflow-y-auto px-4 pt-4 pb-28"
                data-testid={`task-note-unread-slide-${entry.note.client_id}`}
              >
                {entry.note.created_by ? (
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <UserPill
                      userName={entry.note.created_by.username}
                      imageSrc={entry.note.created_by.profile_picture}
                      className="bg-card shadow-sm  text-foreground text-sm font-medium py-1.5 px-2.5"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatNoteTime(entry.note.created_at)}
                    </span>
                  </div>
                ) : null}
                <ContentCard gapClassName="gap-4">
                  <TaskNoteContentView
                    content={entry.note.content}
                    plainText={entry.note.plain_text}
                  />
                  {entry.note_images.length > 0 ? (
                    <TaskNoteReadonlyImages
                      images={entry.note_images}
                      onOpen={(imageClientId) =>
                        handleOpenImageViewer(entry, imageClientId)
                      }
                      testId="task-note-unread-images"
                    />
                  ) : null}
                </ContentCard>
              </div>
            ))}
          </div>
        </div>

        <UnreadViewerFooter
          acknowledgedIds={acknowledgedIds}
          activeIndex={activeIndex}
          currentNoteId={activeEntry?.note.client_id ?? null}
          disableAcknowledge={markReadBy.isPending}
          entries={lockedEntries}
          onAcknowledge={handleGotIt}
        />
      </div>
    </ScrollVisibilityProvider>
  );
}

type UnreadViewerFooterProps = {
  acknowledgedIds: Set<string>;
  activeIndex: number;
  currentNoteId: string | null;
  disableAcknowledge: boolean;
  entries: TaskNoteApiEntry[];
  onAcknowledge: () => void;
};

function UnreadViewerFooter({
  acknowledgedIds,
  activeIndex,
  currentNoteId,
  disableAcknowledge,
  entries,
  onAcknowledge,
}: UnreadViewerFooterProps): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/95 to-transparent px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-10 transition-transform duration-300",
        isHidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <div className="flex flex-col gap-3">
        {entries.length > 1 ? (
          <div
            className="flex items-center justify-center gap-1.5"
            data-testid="task-note-unread-indicators"
          >
            {entries.map((entry, index) => (
              <div
                key={entry.note.client_id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "w-4 bg-primary"
                    : acknowledgedIds.has(entry.note.client_id)
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="task-note-got-it-button"
          disabled={disableAcknowledge || currentNoteId === null}
          type="button"
          onClick={onAcknowledge}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
