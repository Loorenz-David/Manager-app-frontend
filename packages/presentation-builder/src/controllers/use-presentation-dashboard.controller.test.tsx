import { act, renderHook } from "@testing-library/react";
import { notify } from "@beyo/lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fullPresentationFixture, presentationListItemFixture } from "../test/fixtures";
import type { PresentationListItem } from "../types";
import { usePresentationDashboardController } from "./use-presentation-dashboard.controller";

const mocks = vi.hoisted(() => ({
  canManagePresentations: true,
  archivePresentationAsync: vi.fn(),
  createPresentationAsync: vi.fn(),
  listQuery: vi.fn(),
}));

vi.mock("../api/use-presentations-list", () => ({
  usePresentationsList: (filters: unknown) => mocks.listQuery(filters),
}));

vi.mock("../actions/use-create-presentation", () => ({
  useCreatePresentation: () => ({
    createPresentationAsync: mocks.createPresentationAsync,
    isPending: false,
  }),
}));

vi.mock("../actions/use-archive-presentation", () => ({
  useArchivePresentation: () => ({
    archivePresentationAsync: mocks.archivePresentationAsync,
    isPending: false,
  }),
}));

vi.mock("../lib/use-presentation-builder-permissions", () => ({
  usePresentationBuilderPermissions: () => ({
    canManagePresentations: mocks.canManagePresentations,
  }),
}));

function item(overrides: Partial<PresentationListItem>): PresentationListItem {
  return { ...presentationListItemFixture, ...overrides };
}

function listResult(items: PresentationListItem[] = []) {
  return {
    data: { items, has_more: false, limit: 200, offset: 0 },
    error: null,
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  };
}

describe("usePresentationDashboardController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.canManagePresentations = true;
    mocks.createPresentationAsync.mockReset();
    mocks.archivePresentationAsync.mockReset();
    mocks.listQuery.mockReset();
    mocks.listQuery.mockReturnValue(listResult());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("composes filter status with debounced search and removes q when cleared", () => {
    const { result } = renderHook(() =>
      usePresentationDashboardController({
        navigateToEditor: vi.fn(),
        workspaceName: "ManagerBeyo",
        userName: "Marta Karlsson",
      }),
    );

    expect(mocks.listQuery).toHaveBeenLastCalledWith({ limit: 200, offset: 0 });

    act(() => result.current.setSearchValue("  security  "));
    expect(mocks.listQuery).toHaveBeenLastCalledWith({ limit: 200, offset: 0 });
    act(() => vi.advanceTimersByTime(300));
    expect(mocks.listQuery).toHaveBeenLastCalledWith({
      limit: 200,
      offset: 0,
      q: "security",
    });

    act(() => result.current.setActiveFilter("scheduled"));
    expect(mocks.listQuery).toHaveBeenLastCalledWith({
      limit: 200,
      offset: 0,
      q: "security",
      status: "published",
    });

    act(() => result.current.setSearchValue(""));
    act(() => vi.advanceTimersByTime(300));
    expect(mocks.listQuery).toHaveBeenLastCalledWith({
      limit: 200,
      offset: 0,
      status: "published",
    });

    act(() => result.current.setActiveFilter("drafts"));
    expect(mocks.listQuery).toHaveBeenLastCalledWith({ limit: 200, offset: 0, status: "draft" });
    act(() => result.current.setActiveFilter("archived"));
    expect(mocks.listQuery).toHaveBeenLastCalledWith({
      limit: 200,
      offset: 0,
      status: "archived",
    });
  });

  it("groups latest versions and derives four display-ready card statuses from list fields", () => {
    mocks.listQuery.mockReturnValue(
      listResult([
        item({
          client_id: "aup_news_v1",
          logical_client_id: "aup_news",
          version: 1,
          status: "published",
          starts_at: null,
        }),
        item({
          client_id: "aup_news_v2",
          logical_client_id: "aup_news",
          version: 2,
          status: "draft",
          title: "Latest draft",
          slide_count: 2,
          media_kinds: [],
          cover_url: null,
        }),
        item({
          client_id: "aup_published",
          logical_client_id: "aup_published",
          status: "published",
          starts_at: null,
        }),
        item({
          client_id: "aup_scheduled",
          logical_client_id: "aup_scheduled",
          status: "published",
          starts_at: "2099-07-25T08:00:00+00:00",
        }),
        item({
          client_id: "aup_archived",
          logical_client_id: "aup_archived",
          status: "archived",
        }),
      ]),
    );

    const { result } = renderHook(() =>
      usePresentationDashboardController({
        navigateToEditor: vi.fn(),
        workspaceName: "ManagerBeyo",
        userName: "Marta Karlsson",
      }),
    );

    expect(result.current.cards.map((card) => card.displayStatus)).toEqual([
      "draft",
      "published",
      "scheduled",
      "archived",
    ]);
    expect(result.current.cards[0]).toMatchObject({
      id: "aup_news_v2",
      mediaKinds: [],
      coverImageUrl: null,
      versionLabel: "v2",
    });

    act(() => result.current.setActiveFilter("published"));
    expect(result.current.cards.map((card) => card.id)).toEqual(["aup_published"]);
    act(() => result.current.setActiveFilter("scheduled"));
    expect(result.current.cards.map((card) => card.id)).toEqual(["aup_scheduled"]);
  });

  it("creates once, uses the default title, and navigates only after success", async () => {
    let resolveCreate: ((value: typeof fullPresentationFixture) => void) | undefined;
    mocks.createPresentationAsync.mockImplementation(
      () =>
        new Promise<typeof fullPresentationFixture>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const navigateToEditor = vi.fn();
    const { result } = renderHook(() =>
      usePresentationDashboardController({
        navigateToEditor,
        workspaceName: "ManagerBeyo",
        userName: "Marta Karlsson",
      }),
    );

    let firstCreate: Promise<void> | undefined;
    act(() => {
      firstCreate = result.current.createAndOpen();
      void result.current.createAndOpen();
    });
    expect(mocks.createPresentationAsync).toHaveBeenCalledTimes(1);
    expect(mocks.createPresentationAsync).toHaveBeenCalledWith({ title: "Untitled announcement" });
    expect(navigateToEditor).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate?.(fullPresentationFixture);
      await firstCreate;
    });
    expect(navigateToEditor).toHaveBeenCalledWith(fullPresentationFixture.client_id);
  });

  it("notifies exactly once and does not navigate when create fails", async () => {
    mocks.createPresentationAsync.mockRejectedValue(new Error("Create failed"));
    const notifyError = vi.spyOn(notify, "error").mockImplementation(() => undefined);
    const navigateToEditor = vi.fn();
    const { result } = renderHook(() =>
      usePresentationDashboardController({
        navigateToEditor,
        workspaceName: "ManagerBeyo",
        userName: "Marta Karlsson",
      }),
    );

    await act(async () => {
      await result.current.createAndOpen();
    });

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledWith("Announcement could not be created.", "Create failed");
    expect(navigateToEditor).not.toHaveBeenCalled();
  });
});
