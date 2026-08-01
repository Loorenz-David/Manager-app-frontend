import { WorkingSectionsHomeView } from "../../../working_sections";
import { HomeTopCards } from "../HomeTopCards";
import { WorkerHomeSectionStack } from "../WorkerHomeSectionStack";

export function StandardWorkerHomeView(): React.JSX.Element {
  return (
    <WorkerHomeSectionStack
      data-testid="home-page"
      renderSections={(onSelectSection) => (
        <WorkingSectionsHomeView
          topContent={<HomeTopCards />}
          onSelectSection={onSelectSection}
        />
      )}
    />
  );
}
