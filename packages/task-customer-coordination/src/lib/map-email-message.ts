import type { EmailMessageVM } from "@beyo/emails";

import type { EmailMessageRaw } from "../types";

export function mapEmailMessage(raw: EmailMessageRaw): EmailMessageVM {
  return {
    messageId: raw.client_id,
    direction: raw.direction,
    fromName: raw.from_name ?? null,
    fromAddress: raw.from_address ?? "",
    toAddresses: raw.to_addresses_json ?? [],
    ccAddresses: raw.cc_addresses_json ?? [],
    bccAddresses: raw.bcc_addresses_json ?? [],
    subject: raw.subject ?? null,
    textBody: raw.text_body ?? null,
    textBodyClean: raw.text_body_clean ?? null,
    bodyPreview: raw.body_preview ?? null,
    htmlBody: raw.html_body ?? null,
    sentOrReceivedAtIso:
      raw.sent_or_received_at ?? raw.send_attempted_at ?? new Date(0).toISOString(),
    sendAttemptedAtIso: raw.send_attempted_at ?? null,
    sendError: raw.send_error ?? null,
  };
}
