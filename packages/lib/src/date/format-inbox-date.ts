function getOrdinal(day: number): string {
  const mod100 = day % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatInboxDate(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  const sameMonth = sameYear && date.getMonth() === now.getMonth();
  const sameDay = sameMonth && date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (sameMonth) {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    }).format(date);

    return `${weekday}, ${date.getDate()}`;
  }

  const month = new Intl.DateTimeFormat(undefined, {
    month: "short",
  }).format(date);
  const ordinalDay = getOrdinal(date.getDate());

  if (sameYear) {
    return `${month}, ${ordinalDay}`;
  }

  return `${month} ${ordinalDay}, ${date.getFullYear()}`;
}
