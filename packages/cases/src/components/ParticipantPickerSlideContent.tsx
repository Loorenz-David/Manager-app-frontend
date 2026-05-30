import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { SearchBar } from "@beyo/ui";

import { useListUsersQuery } from "../api/use-list-users-query";
import { toParticipantSelectedDisplay } from "../lib/user-view-model";
import type { ParticipantPickerSlideSurfaceProps } from "../surface-ids";
import type { UserCompact } from "../types";

function useDebounce(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

function areSameIdSets(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

export function ParticipantPickerSlideContent(): React.JSX.Element {
  const surfaceHeader = useSurfaceHeader();
  const {
    currentParticipants,
    currentSelectedAll,
    currentSkipParticipants,
    onSave,
  } = useSurfaceProps<ParticipantPickerSlideSurfaceProps>();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, isPending, isError } = useListUsersQuery({
    q: debouncedQuery || undefined,
    limit: 50,
    compact: true,
  });

  const users = data?.users ?? [];
  const totalCount = data?.total ?? null;

  const [localSelectedAll, setLocalSelectedAll] = useState(
    currentSelectedAll ?? false,
  );
  const [localParticipants, setLocalParticipants] = useState<string[]>(
    currentParticipants ?? [],
  );
  const [localSkipParticipants, setLocalSkipParticipants] = useState<string[]>(
    currentSkipParticipants ?? [],
  );

  const initialRef = useRef({
    participants: currentParticipants ?? [],
    selectedAll: currentSelectedAll ?? false,
    skipParticipants: currentSkipParticipants ?? [],
  });

  const isDirty = useMemo(() => {
    const initial = initialRef.current;

    if (localSelectedAll !== initial.selectedAll) {
      return true;
    }

    if (localSelectedAll) {
      return !areSameIdSets(localSkipParticipants, initial.skipParticipants);
    }

    return !areSameIdSets(localParticipants, initial.participants);
  }, [localSelectedAll, localParticipants, localSkipParticipants]);

  function handleSelectAll(): void {
    setLocalSelectedAll(true);
    setLocalSkipParticipants([]);
  }

  function handleDeselectAll(): void {
    setLocalSelectedAll(false);
    setLocalParticipants([]);
    setLocalSkipParticipants([]);
  }

  function handleToggleUser(user: UserCompact): void {
    const id = user.client_id as string;

    if (localSelectedAll) {
      setLocalSkipParticipants((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
      );
      return;
    }

    setLocalParticipants((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  function isUserSelected(user: UserCompact): boolean {
    const id = user.client_id as string;

    if (localSelectedAll) {
      return !localSkipParticipants.includes(id);
    }

    return localParticipants.includes(id);
  }

  function handleSave(): void {
    const selectedUsers = localSelectedAll
      ? []
      : users
          .filter((u) => localParticipants.includes(u.client_id as string))
          .map(toParticipantSelectedDisplay);

    onSave?.({
      participants: localSelectedAll ? [] : localParticipants,
      selectedAll: localSelectedAll,
      skipParticipants: localSelectedAll ? localSkipParticipants : [],
      selectedUsers,
      totalCount,
    });

    surfaceHeader?.requestClose();
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          showSortButton={false}
          showFilterButton={false}
          placeholder="Search participants..."
          isLoading={isPending && searchQuery.length > 0}
          data-testid="participant-picker-search"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            data-testid="participant-picker-select-all"
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-foreground"
            onClick={handleSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            data-testid="participant-picker-deselect-all"
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-foreground"
            onClick={handleDeselectAll}
          >
            Deselect all
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {isPending && !data ? (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : isError ? (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-muted-foreground">
              Could not load users.
            </span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <span className="text-sm text-muted-foreground">
              No users found.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((user) => {
              const selected = isUserSelected(user);
              const userId = user.client_id as string;

              return (
                <button
                  key={userId}
                  type="button"
                  data-testid={`participant-option-${userId}`}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left shadow-sm"
                  onClick={() => handleToggleUser(user)}
                >
                  <span className="relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-soft-container)]">
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm font-semibold uppercase text-muted-foreground">
                        {user.username.charAt(0)}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {user.username}
                    </span>
                    {user.role?.name ? (
                      <span className="mt-0.5 inline-block rounded-full bg-[var(--color-soft-container)] px-2 py-0.5 text-xs text-muted-foreground">
                        {user.role.name}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className={[
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                        : "border-border bg-transparent",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {selected ? (
                      <Check className="size-3 text-[var(--color-card)]" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isDirty ? (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
          <button
            type="button"
            data-testid="participant-picker-save"
            className="flex w-full items-center justify-center rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-[var(--color-card)]"
            onClick={handleSave}
          >
            Save selection
          </button>
        </div>
      ) : null}
    </div>
  );
}
