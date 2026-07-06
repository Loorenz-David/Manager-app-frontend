export function resolveReplySubject(originalSubject: string | null): string {
  const trimmed = (originalSubject ?? "").trim();

  if (!trimmed) {
    return "Re: Conversation";
  }

  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}
