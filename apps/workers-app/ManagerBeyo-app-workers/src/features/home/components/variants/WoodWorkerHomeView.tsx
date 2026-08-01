import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PullToRefresh, usePrefetchOnCondition } from "@beyo/ui";
import { usePreloadSurface, useSurface } from "@beyo/hooks";
import {
  TASK_CREATION_WORKER_INTERNAL_SURFACE_ID,
  preloadWorkerInternalTaskSlideSurface,
  prefetchTaskCreationFormData,
} from "@beyo/task-creation";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import { useWorkingSectionsHomeContext } from "../../../working_sections";
import type { WorkingSectionViewModel } from "../../../working_sections";
import { WorkingSectionCard } from "../../../working_sections/components/WorkingSectionCard";
import { HomeTopCards } from "../HomeTopCards";
import { WorkerHomeSectionStack } from "../WorkerHomeSectionStack";

export function WoodWorkerHomeView(): React.JSX.Element {
  return (
    <WorkerHomeSectionStack
      data-testid="home-page-wood-worker"
      renderSections={(onSelectSection) => (
        <WoodWorkerSectionsView onSelectSection={onSelectSection} />
      )}
    />
  );
}

type WoodWorkerSectionsViewProps = {
  onSelectSection: (section: WorkingSectionViewModel) => void;
};

function WoodWorkerSectionsView({
  onSelectSection,
}: WoodWorkerSectionsViewProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { open: openSurface } = useSurface();
  const { sections, isPending, isError, refetch } =
    useWorkingSectionsHomeContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  usePreloadSurface(preloadWorkerInternalTaskSlideSurface);
  usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [registerScrollElement]);

  return (
    <div
      className="flex h-full flex-col"
      data-testid="wood-worker-sections-view"
    >
      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={refetch}
      >
        <div className="pt-3">
          <HomeTopCards />
        </div>

        {isPending ? (
          <div className="flex flex-col gap-3 px-0 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="mx-4 h-20 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="working-sections-error"
          >
            Could not load sections. Pull to refresh.
          </div>
        ) : sections.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="working-sections-empty"
          >
            No working sections assigned.
          </div>
        ) : (
          <div
            className="flex flex-col gap-3 py-2"
            data-testid="working-sections-list"
          >
            {sections.map((section) => (
              <WorkingSectionCard
                key={section.sectionId}
                section={section}
                onTap={onSelectSection}
              />
            ))}
          </div>
        )}

        <div className="px-4 pt-2 mt-2">
          <button
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
            type="button"
            onClick={() =>
              openSurface(TASK_CREATION_WORKER_INTERNAL_SURFACE_ID)
            }
          >
            + New Internal Task
          </button>
        </div>
      </PullToRefresh>
    </div>
  );
}
