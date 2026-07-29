import { cn } from '@beyo/lib';

export type Announcement = {
  title: string;
  body: string;
  accent: 'info' | 'success' | 'neutral';
};

type Props = {
  /** Max three items render (design rule); extras are sliced off. */
  items: Announcement[];
};

const DOT_COLOR: Record<Announcement['accent'], string> = {
  info: 'bg-kiosk-accent',
  success: 'bg-kiosk-success',
  neutral: 'bg-kiosk-tertiary',
};

/**
 * "TODAY ON THE FLOOR" — short, dated announcement list on the clock-in
 * result. GAP-fed via AnnouncementsAdapter: the host renders this only when
 * items exist.
 */
export function AnnouncementsList({ items }: Props): React.JSX.Element {
  return (
    <section className="mt-7" data-testid="announcements-list">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-tertiary">
        Today on the floor
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {items.slice(0, 3).map((item) => (
          <div
            key={item.title}
            className="rounded-[18px] bg-kiosk-card px-5 py-4 shadow-[0_1px_2px_rgba(30,27,23,0.04)]"
            data-testid="announcement-card"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn('size-2 shrink-0 rounded-full', DOT_COLOR[item.accent])}
              />
              <p className="text-[15px] font-semibold text-kiosk-ink">
                {item.title}
              </p>
            </div>
            <p className="mt-1 pl-[18px] text-[13.5px] leading-relaxed text-kiosk-secondary">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
