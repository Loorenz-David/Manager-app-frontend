import { m } from 'framer-motion';

import { useCaseConversationContext } from '../providers/CaseConversationProvider';

const BANNER_COLLAPSE_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as const,
};

function formatCreatedAt(value: string): string {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return 'Created time unavailable';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt);
}

export function CaseConversationContextBanner(): React.JSX.Element | null {
  const controller = useCaseConversationContext();
  const caseDetail = controller.caseDetail?.case;

  if (!caseDetail) {
    return null;
  }

  return (
    <m.div
      animate={
        controller.isContextBannerCollapsed
          ? { height: 0, opacity: 0, y: -10 }
          : { height: 64, opacity: 1, y: 0 }
      }
      className="fixed inset-x-0 top-[calc(var(--safe-top)+5rem)] z-20 overflow-hidden border-b border-primary/20 bg-primary text-card shadow-sm"
      data-collapsed={controller.isContextBannerCollapsed ? 'true' : 'false'}
      data-testid="case-conversation-context-banner"
      initial={false}
      transition={BANNER_COLLAPSE_TRANSITION}
    >
      <div className="flex h-16 flex-col justify-center px-4">
        <p className="truncate text-sm font-semibold">{caseDetail.type_label ?? 'Case'}</p>
        <p className="truncate text-xs text-card/80">{formatCreatedAt(caseDetail.created_at)}</p>
      </div>
    </m.div>
  );
}
