import { MapPinPen } from "lucide-react";

type ItemPositionPillProps = {
  position: string | null;
  isSeat: boolean;
  onPress?: () => void;
};

export function ItemPositionPill({
  position,
  isSeat,
  onPress,
}: ItemPositionPillProps): React.JSX.Element | null {
  const label = position?.trim() ? `# ${position.trim()}` : isSeat ? "?" : null;

  if (!label) {
    return null;
  }

  const content = (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-semibold">
      <MapPinPen className="size-4 shrink-0" />
      <span>{`Wagon : ${label}`}</span>
    </span>
  );

  if (onPress) {
    return (
      <button
        type="button"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        data-testid="item-position-pill"
        onClick={onPress}
      >
        {content}
      </button>
    );
  }

  return <span data-testid="item-position-pill">{content}</span>;
}
