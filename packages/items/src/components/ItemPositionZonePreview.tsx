import { capitalizeZone } from "./ItemPositionZoneField";

type ItemPositionZonePreviewProps = {
  zone: string | null;
  position: string | null;
  isSeat: boolean;
  onOpenZone?: () => void;
  onOpenPosition?: () => void;
};

function renderPart(
  label: string | null,
  testId: string,
  onClick?: () => void,
  className?: string,
) {
  if (!label) {
    return null;
  }

  const content = <span className={className}>{label}</span>;

  if (!onClick) {
    return (
      <span className="text-sm font-semibold text-muted-foreground" data-testid={testId}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="rounded-full text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid={testId}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export function ItemPositionZonePreview({
  zone,
  position,
  isSeat,
  onOpenZone,
  onOpenPosition,
}: ItemPositionZonePreviewProps): React.JSX.Element | null {
  const zoneLabel = zone?.trim()
    ? capitalizeZone(zone)
    : isSeat
      ? "?"
      : null;
  const positionLabel = position?.trim()
    ? `#${position.trim()}`
    : isSeat
      ? "?"
      : null;

  if (!isSeat && !zoneLabel && !positionLabel) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center gap-2"
      data-testid="item-position-zone-preview"
    >
      {renderPart(zoneLabel, "item-zone-preview-button", onOpenZone, "capitalize")}
      {zoneLabel && positionLabel ? (
        <span
          aria-hidden="true"
          className="h-3 w-px bg-border"
          data-testid="item-position-zone-divider"
        />
      ) : null}
      {renderPart(positionLabel, "item-position-preview-button", onOpenPosition)}
    </span>
  );
}
