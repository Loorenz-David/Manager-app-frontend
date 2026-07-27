import { useState } from "react";
import { SlideStack, SlideStackPane } from "@beyo/ui";
import {
  WorkingSectionsHomeProvider,
} from "../../working_sections";
import type { WorkingSectionViewModel } from "../../working_sections";
import {
  WorkingSectionStepsProvider,
  WorkingSectionStepsView,
} from "../../task_steps";

type WorkerHomeSectionStackProps = {
  "data-testid": string;
  /** Renders the sections list pane; receives the drill-in handler. */
  renderSections: (
    onSelectSection: (section: WorkingSectionViewModel) => void,
  ) => React.ReactNode;
};

/**
 * Home drill-down shared by every worker home interface: the working sections
 * list, with a section's task steps stacked on top of it.
 *
 * Forward navigation is a section tap (a swipe could not say *which* section),
 * so only the back drag is wired — swipe right from the steps pane to return.
 */
export function WorkerHomeSectionStack({
  "data-testid": testId,
  renderSections,
}: WorkerHomeSectionStackProps): React.JSX.Element {
  const [selectedSection, setSelectedSection] =
    useState<WorkingSectionViewModel | null>(null);
  const [activePane, setActivePane] = useState<"sections" | "steps">("sections");

  function handleSelectSection(section: WorkingSectionViewModel) {
    setSelectedSection(section);
    setActivePane("steps");
  }

  // `selectedSection` is deliberately kept: the steps pane must stay renderable
  // while it slides away, and it is re-used if the same section is reopened.
  function handleBack() {
    setActivePane("sections");
  }

  return (
    <WorkingSectionsHomeProvider>
      <div className="relative h-full overflow-hidden" data-testid={testId}>
        <SlideStack activeId={activePane} onBack={handleBack}>
          <SlideStackPane className="h-full overflow-hidden" id="sections">
            <div className="h-full overflow-y-auto">
              {renderSections(handleSelectSection)}
            </div>
          </SlideStackPane>

          {selectedSection ? (
            <SlideStackPane className="h-full overflow-hidden" id="steps">
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
            </SlideStackPane>
          ) : null}
        </SlideStack>
      </div>
    </WorkingSectionsHomeProvider>
  );
}
