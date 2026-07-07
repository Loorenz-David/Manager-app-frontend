import { EyebrowLabel, InfoPill } from "@beyo/ui";

type TaskAssortmentPillProps = {
  assortment: string | null;
  onPress?: () => void;
};

export function TaskAssortmentPill({
  assortment,
  onPress,
}: TaskAssortmentPillProps): React.JSX.Element {
  const label = assortment ?? "—";
  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Final Placement</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-assortment-pill"
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
      <EyebrowLabel>Final Placement</EyebrowLabel>
      <span data-testid="task-assortment-pill">{pill}</span>
    </div>
  );
}
