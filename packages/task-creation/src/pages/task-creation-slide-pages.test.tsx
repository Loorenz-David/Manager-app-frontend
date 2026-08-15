import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { useTaskCreationFormContext } from "../providers/TaskCreationFormProvider";

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => null,
  useSurfaceProps: () => ({}),
}));

/**
 * Stands in for the real form: the reset under test is the provider remount,
 * and the only observable it produces is a fresh set of client ids.
 */
function ClientIdProbe({
  onRequestNewForm,
}: {
  onRequestNewForm?: () => void;
}): React.JSX.Element {
  const { taskClientId, itemClientId, customerClientId, noteClientId } =
    useTaskCreationFormContext();

  return (
    <div>
      <output data-testid="client-ids">
        {[taskClientId, itemClientId, customerClientId, noteClientId].join("|")}
      </output>
      <button type="button" onClick={onRequestNewForm}>
        create another
      </button>
    </div>
  );
}

vi.mock("../components/ReturnFormContent", () => ({
  ReturnFormContent: (props: { onRequestNewForm?: () => void }) => (
    <ClientIdProbe {...props} />
  ),
}));

vi.mock("../components/PreOrderFormContent", () => ({
  PreOrderFormContent: (props: { onRequestNewForm?: () => void }) => (
    <ClientIdProbe {...props} />
  ),
}));

const { ReturnTaskSlidePage } = await import("./ReturnTaskSlidePage");
const { PreOrderTaskSlidePage } = await import("./PreOrderTaskSlidePage");

const server = setupServer(
  // No template configured — the page only needs the query to settle.
  http.get(
    "http://localhost/api/v1/sku-templates/by-task-type/:taskType",
    () => new HttpResponse(null, { status: 404 }),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderPage(page: React.JSX.Element) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>,
  );

  return { invalidateQueries };
}

describe.each([
  {
    name: "ReturnTaskSlidePage",
    page: <ReturnTaskSlidePage />,
    taskType: "return",
  },
  {
    name: "PreOrderTaskSlidePage",
    page: <PreOrderTaskSlidePage />,
    taskType: "pre_order",
  },
])("$name", ({ page, taskType }) => {
  it("hands the next task a fresh set of client ids", () => {
    renderPage(page);

    const before = screen.getByTestId("client-ids").textContent;

    fireEvent.click(screen.getByRole("button", { name: "create another" }));

    expect(screen.getByTestId("client-ids").textContent).not.toBe(before);
  });

  it("drops the SKU preview so the consumed number is not shown again", () => {
    const { invalidateQueries } = renderPage(page);

    fireEvent.click(screen.getByRole("button", { name: "create another" }));

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["sku-templates", "by-task-type", taskType],
    });
  });
});
