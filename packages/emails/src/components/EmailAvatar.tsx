import { cn } from "@beyo/lib";

import { getAvatarColorClass } from "../lib/avatar-color";

type EmailAvatarProps = {
  fromName: string | null | undefined;
  fromAddress: string | null | undefined;
  className?: string;
};

function getInitials(fromName: string | null | undefined, fromAddress: string | null | undefined): string {
  const source = fromName?.trim() || fromAddress?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function EmailAvatar({
  fromName,
  fromAddress,
  className,
}: EmailAvatarProps): React.JSX.Element {
  const initials = getInitials(fromName, fromAddress);
  const colorClass = getAvatarColorClass(fromName || fromAddress || "");

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        colorClass,
        className,
      )}
    >
      {initials}
    </div>
  );
}
