import { notify } from "@beyo/lib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCreatePresentation } from "../actions/use-create-presentation";
import { useArchivePresentation } from "../actions/use-archive-presentation";
import { usePresentationsList } from "../api/use-presentations-list";
import type { DashboardFilterKey } from "../components/dashboard/types";
import {
  derivePresentationDisplayStatus,
  getUserInitials,
  groupLatestVersions,
  toAnnouncementCardData,
} from "../lib/presentation-dashboard";
import { usePresentationBuilderPermissions } from "../lib/use-presentation-builder-permissions";
import type { PresentationListFilters } from "../types";

const SEARCH_DEBOUNCE_MS = 300;
const DASHBOARD_LIST_LIMIT = 200;

type PresentationDashboardControllerOptions = {
  navigateToEditor: (id: string) => void;
  workspaceName: string;
  userName: string;
  userAvatarUrl?: string | null;
};

function getListFilters(
  filter: DashboardFilterKey,
  debouncedSearch: string,
): PresentationListFilters {
  const status =
    filter === "drafts"
      ? "draft"
      : filter === "published" || filter === "scheduled"
        ? "published"
        : filter === "archived"
          ? "archived"
          : undefined;

  return {
    limit: DASHBOARD_LIST_LIMIT,
    offset: 0,
    ...(debouncedSearch === "" ? {} : { q: debouncedSearch }),
    ...(status === undefined ? {} : { status }),
  };
}

function getEmptyCopy(filter: DashboardFilterKey): {
  title: string;
  description: string;
} {
  switch (filter) {
    case "published":
      return { title: "No published announcements", description: "Nothing is live right now." };
    case "drafts":
      return { title: "No drafts", description: "Nothing is in progress right now." };
    case "scheduled":
      return { title: "No scheduled announcements", description: "Nothing is queued to send." };
    case "archived":
      return { title: "No archived announcements", description: "Nothing has been archived yet." };
    case "all":
      return {
        title: "No announcements yet",
        description: "Create your first announcement and it will show up here for the whole workspace.",
      };
  }
}

export function usePresentationDashboardController({
  navigateToEditor,
  workspaceName,
  userName,
  userAvatarUrl,
}: PresentationDashboardControllerOptions) {
  const [activeFilter, setActiveFilter] = useState<DashboardFilterKey>("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const createLockRef = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  const listFilters = useMemo(
    () => getListFilters(activeFilter, debouncedSearch),
    [activeFilter, debouncedSearch],
  );
  const listQuery = usePresentationsList(listFilters);
  const createAction = useCreatePresentation();
  const archiveAction = useArchivePresentation();
  const { canManagePresentations } = usePresentationBuilderPermissions();

  const cards = useMemo(() => {
    const now = new Date();
    const latestItems = groupLatestVersions(listQuery.data?.items ?? []);
    const filteredItems = latestItems.filter((item) => {
      const displayStatus = derivePresentationDisplayStatus(item, now);
      if (activeFilter === "published") return displayStatus === "published";
      if (activeFilter === "scheduled") return displayStatus === "scheduled";
      return true;
    });
    return filteredItems.map((item) => toAnnouncementCardData(item, now));
  }, [activeFilter, listQuery.data?.items]);

  const createAndOpen = useCallback(async () => {
    if (!canManagePresentations || createLockRef.current) return;

    createLockRef.current = true;
    try {
      const presentation = await createAction.createPresentationAsync({
        title: "Untitled announcement",
      });
      navigateToEditor(presentation.client_id);
    } catch (error) {
      notify.error(
        "Announcement could not be created.",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      createLockRef.current = false;
    }
  }, [canManagePresentations, createAction, navigateToEditor]);

  const retry = useCallback(() => {
    void listQuery.refetch();
  }, [listQuery]);

  const archive = useCallback(async (id: string) => {
    if (!canManagePresentations || !window.confirm("Archive this announcement?")) return;
    try {
      await archiveAction.archivePresentationAsync(id);
      notify.success("Announcement archived");
    } catch (error) {
      notify.error(
        "Announcement could not be archived.",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [archiveAction, canManagePresentations]);

  const emptyCopy = getEmptyCopy(activeFilter);

  return {
    activeFilter,
    archive,
    archiveDisabled: archiveAction.isPending || !canManagePresentations,
    cards,
    createAndOpen,
    emptyDescription: emptyCopy.description,
    emptyTitle: emptyCopy.title,
    errorMessage:
      listQuery.error instanceof Error ? listQuery.error.message : "Announcements could not be loaded.",
    isCreating: createAction.isPending,
    isError: listQuery.isError,
    isPending: listQuery.isPending,
    navigateToEditor,
    newAnnouncementDisabled: !canManagePresentations || createAction.isPending,
    retry,
    searchValue,
    setActiveFilter,
    setSearchValue,
    userAvatarUrl,
    userInitials: getUserInitials(userName),
    workspaceName,
  };
}

export type PresentationDashboardController = ReturnType<
  typeof usePresentationDashboardController
>;
