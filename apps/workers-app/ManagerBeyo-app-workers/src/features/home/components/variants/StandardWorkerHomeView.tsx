import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { tabVariants, transitions } from "@beyo/lib";
import {
  WorkingSectionsHomeProvider,
  WorkingSectionsHomeView,
} from "../../../working_sections";
import type { WorkingSectionViewModel } from "../../../working_sections";
import {
  WorkingSectionStepsProvider,
  WorkingSectionStepsView,
} from "../../../task_steps";

export function StandardWorkerHomeView(): React.JSX.Element {
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
      <div className="relative h-full overflow-hidden" data-testid="home-page">
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
                <WorkingSectionsHomeView
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
