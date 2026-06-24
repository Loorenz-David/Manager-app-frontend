import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { tabVariants, transitions } from "@beyo/lib";
import { PullToRefresh } from "@beyo/ui";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import {
  WorkingSectionsHomeProvider,
  useWorkingSectionsHomeContext,
} from "../../../working_sections";
import type { WorkingSectionViewModel } from "../../../working_sections";
import { WorkingSectionCard } from "../../../working_sections/components/WorkingSectionCard";
import {
  WorkingSectionStepsProvider,
  WorkingSectionStepsView,
} from "../../../task_steps";

export function WoodWorkerHomeView(): React.JSX.Element {
  const [selectedSection, setSelectedSection] =
    useState<WorkingSectionViewModel | null>(null);
  const [direction, setDirection] = useState(0);

  function handleSelectSection(section: WorkingSectionViewModel) {
    setDirection(1);
    setSelectedSection(section);
  }

  function handleBack() {
    setDirection(-1);
    setSelectedSection(null);
  }

  return (
    <WorkingSectionsHomeProvider>
      <div
        className="relative h-full overflow-hidden"
        data-testid="home-page-wood-worker"
      >
        <AnimatePresence custom={direction} initial={false}>
          {selectedSection === null ? (
            <m.div
              key="sections"
              animate="center"
              className="absolute inset-0 overflow-hidden transform-gpu backface-hidden will-change-transform"
              custom={direction}
              exit="exit"
              initial="enter"
              transition={transitions.tab}
              variants={tabVariants}
            >
              <div className="h-full overflow-y-auto">
                <WoodWorkerSectionsView
                  onSelectSection={handleSelectSection}
                />
              </div>
            </m.div>
          ) : (
            <m.div
              key={`steps-${selectedSection.sectionId}`}
              animate="center"
              className="absolute inset-0 overflow-hidden transform-gpu backface-hidden will-change-transform"
              custom={direction}
              exit="exit"
              initial="enter"
              transition={transitions.tab}
              variants={tabVariants}
            >
              <div className="h-full overflow-hidden">
                <WorkingSectionStepsProvider
                  sectionId={selectedSection.sectionId}
                >
                  <WorkingSectionStepsView
                    section={selectedSection}
                    onBack={handleBack}
                  />
                </WorkingSectionStepsProvider>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </WorkingSectionsHomeProvider>
  );
}

type WoodWorkerSectionsViewProps = {
  onSelectSection: (section: WorkingSectionViewModel) => void;
};

function WoodWorkerSectionsView({
  onSelectSection,
}: WoodWorkerSectionsViewProps): React.JSX.Element {
  const { sections, isPending, isError, refetch } =
    useWorkingSectionsHomeContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

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
      <header className="px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">My Sections</h1>
      </header>

      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={refetch}
      >
        <div className="px-4 pt-2">
          <button
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
            type="button"
            onClick={() => {}}
          >
            + New Internal Task
          </button>
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
      </PullToRefresh>
    </div>
  );
}
