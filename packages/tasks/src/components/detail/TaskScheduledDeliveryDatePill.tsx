import { isoWeek } from "@beyo/lib";
import { EyebrowLabel, InfoPill } from "@beyo/ui";

type TaskScheduledDeliveryDatePillProps = {
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  onPress?: () => void;
};

export function TaskScheduledDeliveryDatePill({
  scheduledStartAt,
  scheduledEndAt: _scheduledEndAt,
  onPress,
}: TaskScheduledDeliveryDatePillProps): React.JSX.Element {
  const week = isoWeek(scheduledStartAt);
  const label = week === null ? "—" : `Week ${week}`;
  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Delivery window</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-delivery-window-pill"
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
      <EyebrowLabel>Delivery window</EyebrowLabel>
      <span data-testid="task-delivery-window-pill">{pill}</span>
    </div>
  );
}
