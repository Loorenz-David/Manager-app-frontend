const AVATAR_COLOR_CLASSES = [
  "bg-slate-200 text-slate-700",
  "bg-stone-200 text-stone-700",
  "bg-zinc-200 text-zinc-700",
  "bg-neutral-200 text-neutral-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
];

export function getAvatarColorClass(seed: string): string {
  if (!seed) {
    return AVATAR_COLOR_CLASSES[0];
  }

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length]!;
}
