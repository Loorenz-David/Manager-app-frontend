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
    <div className="border-t border-border bg-background">
      <div className="flex gap-3 px-4 pb-3 pt-3">

        <button
          type="button"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-card shadow-sm text-primary border border-between-border px-4 py-3.5 text-sm font-semibold  transition"
          data-testid="task-detail-footer-close-button"
          onClick={onClose}
        >
          Close &amp; Back
        </button>
        <div className="relative flex-1">
          <NavTabBadge
            items={[{ icon: MessageCircle, count: unreadCount }]}
            visible={badgeVisible}
          />

          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl  bg-primary px-4 py-3.5 text-sm font-semibold text-card transition"
            data-testid="task-detail-footer-help-button"
            onClick={onOpenCases}
          >
            <MessageCircle className="size-4" />
            Help
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}
