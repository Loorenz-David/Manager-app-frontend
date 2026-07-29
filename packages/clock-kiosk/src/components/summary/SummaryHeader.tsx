import { Avatar } from '@beyo/ui';

type Props = {
  /** e.g. "Shift complete, Dana" */
  title: string;
  /** e.g. "Pick & Pack · Wednesday 29 July" */
  subtitle: string;
  avatarUrl: string | null;
  /** Full name for the initials fallback. */
  name: string;
};

/** Compact identity header at the top of the clock-out summary. */
export function SummaryHeader({
  title,
  subtitle,
  avatarUrl,
  name,
}: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-3.5" data-testid="summary-header">
      <Avatar
        className="size-12 bg-kiosk-key text-[15px] font-semibold text-kiosk-secondary"
        imageSrc={avatarUrl}
        name={name}
      />
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight text-kiosk-ink sm:text-[26px]">
          {title}
        </h1>
        <p className="truncate text-[13.5px] text-kiosk-secondary sm:text-[15px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
