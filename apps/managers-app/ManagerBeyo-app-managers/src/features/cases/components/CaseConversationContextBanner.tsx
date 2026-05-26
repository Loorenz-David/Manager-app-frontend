import { m } from "framer-motion";

import { ImagePlaceholder } from "@/components/primitives";

import { getCaseTypeImageUrl, getCaseTypeName } from "../types";
import { useCaseConversationContext } from "../providers/CaseConversationProvider";

const BANNER_COLLAPSE_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as const,
};

function formatCreatedAt(value: string): string {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return "Created time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(createdAt);
}

export function CaseConversationContextBanner(): React.JSX.Element | null {
  const controller = useCaseConversationContext();
  const caseDetail = controller.caseDetail?.case;
  const caseTypeImageUrl = getCaseTypeImageUrl(caseDetail?.case_type);
  const caseTypeName = caseDetail
    ? getCaseTypeName(caseDetail.case_type, caseDetail.type_label ?? "Case")
    : "Case";

  if (!caseDetail) {
    return null;
  }

  return (
    <m.div
      animate={controller.isContextBannerCollapsed ? { y: -64 } : { y: 0 }}
      className="fixed inset-x-0 top-[calc(var(--safe-top)+5rem)] z-20 h-16 overflow-hidden border-b border-primary/20 bg-primary text-card shadow-sm will-change-transform"
      data-collapsed={controller.isContextBannerCollapsed ? "true" : "false"}
      data-testid="case-conversation-context-banner"
      initial={false}
      transition={BANNER_COLLAPSE_TRANSITION}
    >
      <div className="flex h-16 flex-col justify-center px-4">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card/10">
              {caseTypeImageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  draggable={false}
                  loading="lazy"
                  src={caseTypeImageUrl}
                />
              ) : (
                <ImagePlaceholder
                  className="bg-transparent"
                  iconClassName="size-4 text-card/70"
                />
              )}
            </div>

            <p className="truncate text-lg font-semibold">{caseTypeName}</p>
          </div>
          <p className="truncate text-xs text-card/80">
            {formatCreatedAt(caseDetail.created_at)}
          </p>
        </div>
      </div>
    </m.div>
  );
}
