import { createElement, type PropsWithChildren } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReassignedStepItem } from "../types";

const surfaceHeader = { setTitle: vi.fn(), setActions: vi.fn() };

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => surfaceHeader,
  useSurfaceProps: () => ({
    adapter: {
      StepRow: ({ step }: { step: ReassignedStepItem }) =>
        createElement(
          "div",
          { "data-testid": `row-${step.client_id}` },
          step.item?.article_number ?? "no-item",
        ),
    },
  }),
}));

const { ReassignedStepsSlidePage } = await import("./ReassignedStepsSlidePage");

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return render(<ReassignedStepsSlidePage />, { wrapper: Wrapper });
}

describe("ReassignedStepsSlidePage", () => {
  it("sets the surface header title", async () => {
    renderPage();
    await waitFor(() =>
      expect(surfaceHeader.setTitle).toHaveBeenCalledWith("Re-Assigned"),
    );
  });

  it("renders one container per working section, ordered by order_list", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("reassigned-steps-list")).toBeInTheDocument(),
    );

    expect(
      screen.getByTestId("reassigned-steps-group-name-wsec_carpentry"),
    ).toHaveTextContent("Carpentry");
    expect(
      screen.getByTestId("reassigned-steps-group-name-wsec_upholstery"),
    ).toHaveTextContent("Upholstery");

    const groups = screen.getAllByTestId(/^reassigned-steps-group-wsec_/);
    expect(groups[0]).toHaveAttribute(
      "data-testid",
      "reassigned-steps-group-wsec_carpentry", // order_list 1 sorts first
    );
  });

  it("renders the injected app row per item", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("row-tstp_9f3a1c")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("row-tstp_carpentry_1")).toBeInTheDocument();
    // The item-less step is listed when no search is active.
    expect(screen.getByTestId("row-tstp_no_item")).toHaveTextContent("no-item");
  });

  it("narrows the list from the debounced search input", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("row-tstp_carpentry_1")).toBeInTheDocument(),
    );

    fireEvent.change(
      screen.getByTestId("reassigned-steps-search").querySelector("input")!,
      { target: { value: "sofa" } },
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("row-tstp_9f3a1c")).toBeInTheDocument();
        expect(
          screen.queryByTestId("row-tstp_carpentry_1"),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId("row-tstp_no_item")).not.toBeInTheDocument();
      },
      { timeout: 3_000 },
    );
  });

  it("explains that item-less steps are hidden when a search finds nothing", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("reassigned-steps-list")).toBeInTheDocument(),
    );

    fireEvent.change(
      screen.getByTestId("reassigned-steps-search").querySelector("input")!,
      { target: { value: "zzzz-no-match" } },
    );

    await waitFor(
      () =>
        expect(screen.getByTestId("reassigned-steps-empty")).toHaveTextContent(
          /Tasks without an item are hidden while searching/,
        ),
      { timeout: 3_000 },
    );
  });
});
