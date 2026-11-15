import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestWrapper } from "@/test-utils/query-client";
import type { UpholsteryInventoryId } from "@/types/common";

import {
  buckets,
  childRecord,
  historyPage,
  historyRecord,
} from "../lib/inventory-history.fixtures";
import { InventoryHistoryTimeline } from "./InventoryHistoryTimeline";

const mocks = vi.hoisted(() => ({
  listHistory: vi.fn(),
  open: vi.fn(),
}));

vi.mock("../api/list-upholstery-inventory-history", () => ({
  listUpholsteryInventoryHistory: mocks.listHistory,
}));

vi.mock("@/hooks/use-surface", () => ({
  useSurface: () => ({ open: mocks.open }),
}));

// The real module drags in every task surface loader; only the id matters.
vi.mock("@/features/tasks/surfaces", () => ({
  TASK_DETAIL_SURFACE_ID: "task-detail-test",
}));

const inventoryId = "uin_1" as UpholsteryInventoryId;

const task12 = {
  client_id: "tsk_12",
  task_scalar_id: 12,
  title: "Sofa",
  state: "in_progress",
  is_deleted: false,
};
const task14 = {
  client_id: "tsk_14",
  task_scalar_id: 14,
  title: "Chair",
  state: "pending",
  is_deleted: true,
};

const receivedRecord = historyRecord({
  client_id: "uih_received",
  movement_type: "order_received",
  trigger: "order_received",
  quantity_meters: "20.000",
  delta: buckets({ stored: "20.000", ordered: "-20.000" }),
  created_by: { client_id: "usr_1", username: "anna", profile_picture: null },
  children: [
    childRecord({
      client_id: "uih_child_1",
      requirement: {
        client_id: "iur_1",
        from_state: "ordered",
        to_state: "available",
      },
      task: task14,
    }),
  ],
});

const reservedRecord = historyRecord({
  client_id: "uih_reserved",
  movement_type: "reserved_for_use",
  trigger: "step_transition",
  task: task12,
  delta: buckets({ stored: "-3.000", in_use: "3.000" }),
  is_reconstructed: true,
  anomaly: "in_need_clamped_at_zero",
  chain_break: true,
});

const openingRecord = historyRecord({
  client_id: "uih_opening",
  movement_type: "opening_balance",
  trigger: "migration_baseline",
});

function renderTimeline() {
  return render(<InventoryHistoryTimeline inventoryId={inventoryId} />, {
    wrapper: createTestWrapper(),
  });
}

beforeEach(() => {
  mocks.listHistory.mockReset();
  mocks.open.mockReset();
});

describe("InventoryHistoryTimeline", () => {
  it("shows a loading state", () => {
    mocks.listHistory.mockReturnValue(new Promise(() => undefined));

    renderTimeline();

    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Loading history…")).toBeInTheDocument();
  });

  it("shows an error state", async () => {
    mocks.listHistory.mockRejectedValue(new Error("boom"));

    renderTimeline();

    expect(
      await screen.findByText("Could not load history."),
    ).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    mocks.listHistory.mockResolvedValue(historyPage());

    renderTimeline();

    expect(await screen.findByText("No history yet.")).toBeInTheDocument();
    expect(
      screen.queryByTestId("inventory-history-show-more"),
    ).not.toBeInTheDocument();
  });

  it("renders entries with chips, badges, actor and nested children", async () => {
    mocks.listHistory.mockResolvedValue(
      historyPage({ records: [receivedRecord, reservedRecord, openingRecord] }),
    );

    renderTimeline();

    expect(
      await screen.findByText("Order received (20 m)"),
    ).toBeInTheDocument();
    expect(mocks.listHistory).toHaveBeenCalledWith(inventoryId, {
      limit: 20,
      cursor: null,
    });

    const entries = screen.getAllByTestId("inventory-history-entry");
    expect(entries).toHaveLength(3);
    expect(within(entries[0]).getByText("Stored +20 m")).toBeInTheDocument();
    expect(within(entries[0]).getByText(/anna ·/)).toBeInTheDocument();
    expect(within(entries[1]).getByText("Reserved for production")).toBeInTheDocument();
    expect(within(entries[1]).getByText("#12 Sofa")).toBeInTheDocument();
    expect(within(entries[1]).getByText("Reconstructed")).toBeInTheDocument();
    expect(within(entries[1]).getByText("Clamped")).toBeInTheDocument();
    expect(
      within(entries[1]).getByText("Unrecorded change before this"),
    ).toBeInTheDocument();
    expect(
      within(entries[2]).getByText("Opening balance (history starts here)"),
    ).toBeInTheDocument();
    // No actor and not reconstructed.
    expect(within(entries[2]).getByText(/System ·/)).toBeInTheDocument();

    const child = screen.getByTestId("inventory-history-child");
    expect(within(child).getByText("#14 Chair")).toBeInTheDocument();
    expect(within(child).getByText("(deleted)")).toBeInTheDocument();
    expect(within(child).getByText("Ordered → Available")).toBeInTheDocument();

    // Entries without a task are not tappable.
    expect(entries[0].tagName).toBe("DIV");
    expect(entries[2].tagName).toBe("DIV");
    expect(entries[1].tagName).toBe("BUTTON");
    expect(child.tagName).toBe("BUTTON");
  });

  it("never nests a button inside another button", async () => {
    mocks.listHistory.mockResolvedValue(
      historyPage({
        records: [
          historyRecord({
            ...receivedRecord,
            task: task12,
          }),
          reservedRecord,
        ],
        pagination: { limit: 20, has_more: true, next_cursor: "c2" },
      }),
    );

    const { container } = renderTimeline();

    await screen.findByText("Order received (20 m)");
    expect(container.querySelectorAll("button").length).toBeGreaterThan(2);
    expect(container.querySelectorAll("button button")).toHaveLength(0);
  });

  it("opens the task when tapping a parent with a task and when tapping a child", async () => {
    const user = userEvent.setup();
    mocks.listHistory.mockResolvedValue(
      historyPage({ records: [receivedRecord, reservedRecord] }),
    );

    renderTimeline();

    await user.click(await screen.findByText("Reserved for production"));
    expect(mocks.open).toHaveBeenCalledWith("task-detail-test", {
      taskId: "tsk_12",
    });

    await user.click(screen.getByText("Ordered → Available"));
    expect(mocks.open).toHaveBeenLastCalledWith("task-detail-test", {
      taskId: "tsk_14",
    });

    // The parent without a task does nothing.
    await user.click(screen.getByText("Order received (20 m)"));
    expect(mocks.open).toHaveBeenCalledTimes(2);
  });

  it("fetches the next page with the cursor on Show more and appends it", async () => {
    const user = userEvent.setup();
    mocks.listHistory
      .mockResolvedValueOnce(
        historyPage({
          records: [receivedRecord],
          pagination: { limit: 20, has_more: true, next_cursor: "cursor-2" },
        }),
      )
      .mockResolvedValueOnce(
        historyPage({
          // Overlapping row is shown once.
          records: [receivedRecord, openingRecord],
          pagination: { limit: 20, has_more: false, next_cursor: null },
        }),
      );

    renderTimeline();

    await user.click(await screen.findByTestId("inventory-history-show-more"));

    expect(
      await screen.findByText("Opening balance (history starts here)"),
    ).toBeInTheDocument();
    expect(mocks.listHistory).toHaveBeenLastCalledWith(inventoryId, {
      limit: 20,
      cursor: "cursor-2",
    });
    expect(screen.getAllByTestId("inventory-history-entry")).toHaveLength(2);
    await waitFor(() =>
      expect(
        screen.queryByTestId("inventory-history-show-more"),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows the drift banner with the drifting buckets", async () => {
    mocks.listHistory.mockResolvedValue(
      historyPage({
        records: [openingRecord],
        integrity: {
          status: "drift",
          latest_record_id: "uih_opening",
          pointer_matches: true,
          expected: buckets({ stored: "20.000" }),
          current: buckets({ stored: "17.000" }),
          drift: buckets({ stored: "-3.000" }),
        },
      }),
    );

    renderTimeline();

    const banner = await screen.findByTestId("inventory-history-drift-banner");
    expect(
      within(banner).getByText("Totals differ from the recorded history"),
    ).toBeInTheDocument();
    expect(
      within(banner).getByText(/outside the app's recorded actions/),
    ).toBeInTheDocument();
    expect(within(banner).getByText("Stored −3 m")).toBeInTheDocument();
  });

  it("shows no banner for no_baseline", async () => {
    mocks.listHistory.mockResolvedValue(
      historyPage({
        records: [openingRecord],
        integrity: {
          status: "no_baseline",
          latest_record_id: null,
          pointer_matches: false,
          expected: null,
          current: buckets(),
          drift: null,
        },
      }),
    );

    renderTimeline();

    await screen.findByText("Opening balance (history starts here)");
    expect(
      screen.queryByTestId("inventory-history-drift-banner"),
    ).not.toBeInTheDocument();
  });
});
