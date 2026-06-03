const TASK_STEP_GROUP_DESCRIPTION_RE =
  /^(.+?) assigned to working sections (.+)$/;

type TaskStepGroupFlowDescriptionProps = {
  description: string;
};

export function TaskStepGroupFlowDescription({
  description,
}: TaskStepGroupFlowDescriptionProps): React.JSX.Element {
  const match = TASK_STEP_GROUP_DESCRIPTION_RE.exec(description);

  if (!match) {
    return <span>{description}</span>;
  }

  const [, username, sectionsPart] = match;
  const sections = sectionsPart.split(/,\s*/);

  return (
    <span>
      <span className="font-bold capitalize">{username}</span>
      {" assigned to working sections "}
      {sections.map((section, index) => (
        <span key={`${section}-${index}`}>
          <span className="font-bold capitalize">{section.trim()}</span>
          {index < sections.length - 1 ? ", " : ""}
        </span>
      ))}
    </span>
  );
}
