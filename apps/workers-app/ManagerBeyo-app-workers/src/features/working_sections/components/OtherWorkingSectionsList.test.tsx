import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkingSectionId } from "@beyo/lib";

const mocks = vi.hoisted(() => ({
  fetchWorkspaceWorkingSections: vi.fn(),
}));

vi.mock("@beyo/ui", () => ({
  Avatar: ({ name, imageSrc }: { name: string; imageSrc: string | null }) =>
    createElement("span", { "data-testid": "avatar", "data-src": imageSrc ?? "" }, name),
  BackendImage: ({ src }: { src: string | null }) =>
    createElement("span", { "data-testid": "backend-image", "data-src": src ?? "" }),
  ImagePlaceholder: () => createElement("span"),
}));

vi.mock("../api/fetch-workspace-working-sections", () => ({
  fetchWorkspaceWorkingSections: mocks.fetchWorkspaceWorkingSections,
}));

const { OtherWorkingSectionCard } = await import("./OtherWorkingSectionCard");
const { useOtherWorkingSectionsController } = await import(
  "../controllers/use-other-working-sections.controller"
);
const { toWorkspaceWorkingSectionViewModel } = await import("../types");

function buildSection(
  overrides: Partial<{
    client_id: string;
    name: string;
    members: { client_id: string; username: string; profile_picture: string | null }[];
  }> = {},
) {
  return {
    client_id: (overrides.client_id ?? "wsec_1") as WorkingSectionId,
    name: overrides.name ?? "Sanding",
    image: null,
    allows_batch_working: true,
    allows_shopify_product_modifications: false,
    members: overrides.members ?? [],
  };
}

function buildMembers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    client_id: `usr_${index}`,
    username: `worker.${index}`,
    profile_picture: index === 0 ? "https://cdn.example.com/0.webp" : null,
  }));
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return createElement(QueryClientProvider, { client }, children);
}

afterEach(() => {
  cleanup();
  mocks.fetchWorkspaceWorkingSections.mockReset();
});

describe("OtherWorkingSectionCard", () => {
  it("renders at most three member avatars and an overflow count", () => {
    const section = toWorkspaceWorkingSectionViewModel(
      buildSection({ members: buildMembers(5) }),
    );

    render(<OtherWorkingSectionCard section={section} onTap={vi.fn()} />);

    expect(screen.getAllByTestId("avatar")).toHaveLength(3);
    expect(
      screen.getByTestId("other-working-section-card-members-overflow-wsec_1"),
    ).toHaveTextContent("+2");
  });

  it("omits the overflow count when the members fit", () => {
    const section = toWorkspaceWorkingSectionViewModel(
      buildSection({ members: buildMembers(2) }),
    );

    render(<OtherWorkingSectionCard section={section} onTap={vi.fn()} />);

    expect(screen.getAllByTestId("avatar")).toHaveLength(2);
    expect(
      screen.queryByTestId("other-working-section-card-members-overflow-wsec_1"),
    ).not.toBeInTheDocument();
  });

  it("never renders the caller's totals — they belong to another section", () => {
    const section = toWorkspaceWorkingSectionViewModel(buildSection());

    render(<OtherWorkingSectionCard section={section} onTap={vi.fn()} />);

    expect(screen.queryByText(/active/)).not.toBeInTheDocument();
    expect(screen.queryByText(/done today/)).not.toBeInTheDocument();
  });
});

describe("useOtherWorkingSectionsController", () => {
  it("does not fetch until the list is expanded", async () => {
    mocks.fetchWorkspaceWorkingSections.mockResolvedValue([]);

    const { result } = renderHook(
      () => useOtherWorkingSectionsController([]),
      { wrapper },
    );

    expect(mocks.fetchWorkspaceWorkingSections).not.toHaveBeenCalled();

    result.current.toggleExpanded();

    await waitFor(() =>
      expect(mocks.fetchWorkspaceWorkingSections).toHaveBeenCalledTimes(1),
    );
  });

  it("excludes the sections the worker is already a member of", async () => {
    mocks.fetchWorkspaceWorkingSections.mockResolvedValue([
      buildSection({ client_id: "wsec_mine", name: "Mine" }),
      buildSection({ client_id: "wsec_other", name: "Other" }),
    ]);

    const { result } = renderHook(
      () =>
        useOtherWorkingSectionsController(["wsec_mine" as WorkingSectionId]),
      { wrapper },
    );

    result.current.toggleExpanded();

    await waitFor(() => expect(result.current.otherSections).toHaveLength(1));
    expect(result.current.otherSections[0].name).toBe("Other");
  });
});
