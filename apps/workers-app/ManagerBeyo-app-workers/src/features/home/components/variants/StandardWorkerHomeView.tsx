import { WorkingSectionsHomeView } from "../../../working_sections";
import { WorkerHomeSectionStack } from "../WorkerHomeSectionStack";

export function StandardWorkerHomeView(): React.JSX.Element {
  return (
    <WorkerHomeSectionStack
      data-testid="home-page"
      renderSections={(onSelectSection) => (
        <WorkingSectionsHomeView onSelectSection={onSelectSection} />
      )}
    />
  );
}
