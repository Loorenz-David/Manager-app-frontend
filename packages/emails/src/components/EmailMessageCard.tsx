import { ChevronDown } from "lucide-react";

import { formatInboxDate } from "@beyo/lib";

import { EmailAvatar } from "./EmailAvatar";
import type { EmailMessageVM } from "../types";

type EmailMessageCardProps = {
  message: EmailMessageVM;
  onOpenMessageDetails: (message: EmailMessageVM) => void;
};

export function EmailMessageCard({
  message,
  onOpenMessageDetails,
}: EmailMessageCardProps): React.JSX.Element {
  const body =
    message.textBodyClean ||
    message.textBody ||
    message.bodyPreview ||
    "No plain text body available.";
  const directionLabel = message.direction === "inbound" ? "to me" : "from me";

  return (
    <div className="mx-4 rounded-xl bg-card px-4 py-4 shadow-sm">
      <div className="flex gap-3">
        <EmailAvatar
          fromAddress={message.fromAddress}
          fromName={message.fromName}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {message.fromName || message.fromAddress}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatInboxDate(message.sentOrReceivedAtIso)}
              </p>
            </div>

            <button
              className="flex items-center gap-1 text-xs text-muted-foreground"
              type="button"
              onClick={() => {
                onOpenMessageDetails(message);
              }}
            >
              <span>{directionLabel}</span>
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          {message.subject ? (
            <p className="mt-3 text-sm font-medium text-foreground">
              {message.subject}
            </p>
          ) : null}

          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
            {body}
          </p>

          {message.direction === "outbound" && !message.sendAttemptedAtIso ? (
            <p className="mt-3 text-xs text-muted-foreground">Sending…</p>
          ) : null}

          {message.direction === "outbound" && message.sendError ? (
            <p className="mt-3 text-xs text-[var(--color-warning)]">
              Delivery failed: {message.sendError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
