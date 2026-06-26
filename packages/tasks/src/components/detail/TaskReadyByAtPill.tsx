import { formatShortDate } from "@beyo/lib";
import { EyebrowLabel, InfoPill } from "@beyo/ui";

type TaskReadyByAtPillProps = {
  readyByAt: string | null;
  onPress?: () => void;
};

export function TaskReadyByAtPill({
  readyByAt,
  onPress,
}: TaskReadyByAtPillProps): React.JSX.Element {
  const label = formatShortDate(readyByAt) ?? "—";
  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Ready by</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-ready-by-pill"
          type="button"
          onClick={onPress}
        >
          {pill}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Ready by</EyebrowLabel>
      <span data-testid="task-ready-by-pill">{pill}</span>
    </div>
  );
}
