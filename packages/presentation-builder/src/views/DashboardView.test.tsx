import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { envelope, fullPresentationFixture, presentationListItemFixture } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";
import type { PresentationListItem } from "../types";
import { DashboardView } from "./DashboardView";

vi.mock("../lib/use-presentation-builder-permissions", () => ({
  usePresentationBuilderPermissions: () => ({ canManagePresentations: true }),
}));

const API_PATTERN = "*/api/v1/app-update-presentations";

function item(overrides: Partial<PresentationListItem>): PresentationListItem {
  return { ...presentationListItemFixture, ...overrides };
}

function listEnvelope(items: PresentationListItem[]) {
  return envelope({
    app_update_presentations_pagination: {
      items,
      has_more: false,
      limit: 200,
      offset: 0,
    },
  });
}

function renderDashboard(navigateToEditor = vi.fn()) {
  const { Wrapper } = createTestContext();
  return {
    navigateToEditor,
    ...render(
      <DashboardView
        navigateToEditor={navigateToEditor}
        workspaceName="ManagerBeyo"
        userName="Marta Karlsson"
      />,
      { wrapper: Wrapper },
    ),
  };
}

describe("DashboardView", () => {
  beforeEach(() => {
    server.use(http.get(API_PATTERN, () => HttpResponse.json(listEnvelope([]))));
  });

  afterEach(() => cleanup());

  it("renders grouped cards with four statuses and list-provided preview data", async () => {
    server.use(
      http.get(API_PATTERN, () =>
        HttpResponse.json(
          listEnvelope([
            item({
              client_id: "aup_product_v1",
              logical_client_id: "aup_product",
              version: 1,
              title: "Old product update",
            }),
            item({
              client_id: "aup_product_v2",
              logical_client_id: "aup_product",
              version: 2,
              title: "Q3 Product Update",
              status: "published",
              starts_at: null,
              slide_count: 3,
              media_kinds: ["image", "video"],
              cover_url: "https://cdn.example.com/cover.jpg",
            }),
            item({
              client_id: "aup_draft",
              logical_client_id: "aup_draft",
              title: "Summer office hours",
              status: "draft",
              slide_count: 2,
              media_kinds: [],
              cover_url: null,
            }),
            item({
              client_id: "aup_scheduled",
              logical_client_id: "aup_scheduled",
              title: "New security policy",
              status: "published",
              starts_at: "2099-07-25T08:00:00+00:00",
            }),
            item({
              client_id: "aup_archived",
              logical_client_id: "aup_archived",
              title: "Old workflow reminder",
              status: "archived",
            }),
          ]),
        ),
      ),
    );

    const { container } = renderDashboard();

    await screen.findByText("Q3 Product Update");
    expect(screen.queryByText("Old product update")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("presentation-announcement-card-aup_product_v2")).getByText(
        "Published",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("presentation-announcement-card-aup_draft")).getByText("Draft"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("presentation-announcement-card-aup_scheduled")).getByText(
        "Scheduled",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("presentation-announcement-card-aup_archived")).getByText(
        "Archived",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("3 slides · sends Jul 25")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();

    const publishedCard = screen.getByTestId("presentation-announcement-card-aup_product_v2");
    expect(publishedCard.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/cover.jpg",
    );
    const draftCard = screen.getByTestId("presentation-announcement-card-aup_draft");
    expect(draftCard.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-testid="presentation-dashboard-new-announcement-card"]')).not.toBeNull();
  });

  it("renders reflected loading, filter-specific empty, and retryable error states", async () => {
    let shouldFail = true;
    server.use(
      http.get(API_PATTERN, ({ request }) => {
        if (shouldFail) {
          return HttpResponse.json({ detail: "Unavailable" }, { status: 503 });
        }
        if (new URL(request.url).searchParams.get("status") === "draft") {
          return HttpResponse.json(listEnvelope([]));
        }
        return HttpResponse.json(
          listEnvelope([
            item({
              client_id: "aup_recovered",
              logical_client_id: "aup_recovered",
              title: "Recovered announcement",
              status: "published",
              starts_at: null,
            }),
          ]),
        );
      }),
    );

    renderDashboard();
    expect(screen.getByTestId("presentation-dashboard-skeleton-grid")).toBeInTheDocument();
    await screen.findByTestId("presentation-dashboard-error-state");

    shouldFail = false;
    fireEvent.click(screen.getByTestId("presentation-dashboard-error-retry-button"));
    await screen.findByText("Recovered announcement");

    fireEvent.click(screen.getByTestId("presentation-dashboard-filter-chip-drafts"));
    await waitFor(() => expect(screen.getByText("No drafts")).toBeInTheDocument());
  });

  it("creates from the top action with the default title and opens the returned editor", async () => {
    server.use(
      http.put(API_PATTERN, async ({ request }) => {
        expect(await request.json()).toEqual({ title: "Untitled announcement" });
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const navigateToEditor = vi.fn();
    renderDashboard(navigateToEditor);

    await screen.findByText("No announcements yet");
    fireEvent.click(screen.getByTestId("presentation-dashboard-new-announcement-button"));

    await waitFor(() =>
      expect(navigateToEditor).toHaveBeenCalledWith(fullPresentationFixture.client_id),
    );
  });
});
