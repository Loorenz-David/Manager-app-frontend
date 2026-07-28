import { z } from "zod";

export const INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY =
  "beyo.taskCreation.internal.lastItemPositionByUser";
export const INTERNAL_ITEM_POSITION_MEMORY_TTL_MS = 5 * 60 * 1000;

const MemoryEntrySchema = z.object({
  position: z.string().min(1),
  rememberedAt: z.number().int().nonnegative(),
});

const MemorySchema = z.record(z.string(), MemoryEntrySchema);

type Memory = z.infer<typeof MemorySchema>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function removeStorageKey(storage: Storage): void {
  try {
    storage.removeItem(INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY);
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function readMemory(storage: Storage): Memory {
  try {
    const raw = storage.getItem(INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = MemorySchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Malformed or inaccessible storage is treated as empty memory.
  }

  removeStorageKey(storage);
  return {};
}

function persistMemory(storage: Storage, memory: Memory): void {
  try {
    if (Object.keys(memory).length === 0) {
      storage.removeItem(INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY);
      return;
    }

    storage.setItem(
      INTERNAL_ITEM_POSITION_MEMORY_STORAGE_KEY,
      JSON.stringify(memory),
    );
  } catch {
    // Remembering a position is an enhancement and must never block creation.
  }
}

function removeExpiredEntries(memory: Memory, now: number): Memory {
  return Object.fromEntries(
    Object.entries(memory).filter(([, entry]) => {
      const age = now - entry.rememberedAt;
      return age >= 0 && age < INTERNAL_ITEM_POSITION_MEMORY_TTL_MS;
    }),
  );
}

export function readRememberedInternalItemPosition(
  userId: string,
  now = Date.now(),
): string | null {
  if (!userId) {
    return null;
  }

  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const memory = readMemory(storage);
  const activeMemory = removeExpiredEntries(memory, now);

  if (Object.keys(activeMemory).length !== Object.keys(memory).length) {
    persistMemory(storage, activeMemory);
  }

  return activeMemory[userId]?.position ?? null;
}

export function clearRememberedInternalItemPosition(userId: string): void {
  if (!userId) {
    return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  const memory = readMemory(storage);
  if (!(userId in memory)) {
    return;
  }

  const nextMemory = { ...memory };
  delete nextMemory[userId];
  persistMemory(storage, nextMemory);
}

export function writeRememberedInternalItemPosition(
  userId: string,
  position: string | null | undefined,
  now = Date.now(),
): void {
  if (!userId) {
    return;
  }

  const trimmedPosition = position?.trim() ?? "";
  if (!trimmedPosition) {
    clearRememberedInternalItemPosition(userId);
    return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  const memory = removeExpiredEntries(readMemory(storage), now);
  memory[userId] = {
    position: trimmedPosition,
    rememberedAt: now,
  };
  persistMemory(storage, memory);
}
