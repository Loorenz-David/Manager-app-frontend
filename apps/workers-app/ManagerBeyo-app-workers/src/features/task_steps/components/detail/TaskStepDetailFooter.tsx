import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { NavTabBadge } from "@beyo/ui";

type TaskStepDetailFooterProps = {
  unreadCount: number;
  isScrollHidden: boolean;
  onOpenCases: () => void;
  onClose: () => void;
};

export function TaskStepDetailFooter({
  unreadCount,
  isScrollHidden,
  onOpenCases,
  onClose,
}: TaskStepDetailFooterProps): React.JSX.Element {
  const [badgeVisible, setBadgeVisible] = useState(false);
  const lastCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (unreadCount > lastCountRef.current) {
      lastCountRef.current = unreadCount;
      setBadgeVisible(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setBadgeVisible(false);
      }, 5_000);
    }
  }, [unreadCount]);

  useEffect(() => {
    if (isScrollHidden && badgeVisible) {
      setBadgeVisible(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isScrollHidden, badgeVisible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative z-10 shrink-0 border-t border-border bg-background px-4 pb-[calc(var(--safe-bottom,0)+0.75rem)] pt-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <NavTabBadge
            items={[{ icon: MessageCircle, count: unreadCount }]}
            visible={badgeVisible}
          />

          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition"
            data-testid="task-detail-footer-help-button"
            onClick={onOpenCases}
          >
            <MessageCircle className="size-4" />
            Help
          </button>
        </div>

        <button
          type="button"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card transition"
          data-testid="task-detail-footer-close-button"
          onClick={onClose}
        >
          Close &amp; Back
        </button>
      </div>
    </div>
  );
}
