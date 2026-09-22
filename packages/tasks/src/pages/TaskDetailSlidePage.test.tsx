import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskDetailRaw } from "../types";

/**
 * Every sub-component is a probe that records the props the page handed it.
 * The rule under test is the page's: a read-only role gets `undefined` for
 * each editor, no ⋮ and no production time. The permissions hook is real;
 * only the role source is mocked.
 */
const mocks = vi.hoisted(() => ({
  role: "manager" as string,
  received: {} as Record<string, Record<string, unknown>>,
  openMenu: vi.fn(),
  openReadyByAtSheet: vi.fn(),
  openPositionSheet: vi.fn(),
  openQuantitySheet: vi.fn(),
  openCustomerDetailsSheet: vi.fn(),
  openWorkingSectionsSlide: vi.fn(),
  openDeliveryDateSheet: vi.fn(),
  openAssortmentSheet: vi.fn(),
  openFulfillmentMethodSheet: vi.fn(),
  openUpholsteryAmountSheet: vi.fn(),
  openFlowRecord: vi.fn(),
  taskState: "pending" as string,
}));

function probe(name: string) {
  return (props: Record<string, unknown>) => {
    mocks.received[name] = props;
    return <div data-testid={`probe-${name}`} />;
  };
}

vi.mock("@beyo/auth", () => ({
  AuthRole: { Admin: "admin", Manager: "manager", Worker: "worker", Seller: "seller" },
  useRole: () => ({ hasRole: (value: string) => value === mocks.role }),
}));

vi.mock("@beyo/hooks", () => ({
  usePreloadSurface: vi.fn(),
  useSurfaceHeader: () => ({ requestClose: vi.fn(), setHeaderHidden: vi.fn() }),
  useSurfaceProps: () => ({ taskId: "tsk_1" }),
}));

vi.mock("@beyo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/ui")>();
  return {
    ...actual,
    PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useScrollHide: () => ({
      scrollRef: { current: null },
      isHidden: false,
      isAtEdge: false,
      hideProgressContainerRef: { current: null },
    }),
    useSurfaceStore: { getState: () => ({ open: vi.fn() }) },
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@beyo/item-economics", () => ({
  ProductionTimeSection: probe("productionTime"),
}));

vi.mock("@beyo/task-notes", () => ({
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID: "task-note-unread-viewer",
  useTaskNotesUnreadController: vi.fn(),
  preloadTaskNoteUnreadViewerSurface: vi.fn(),
  preloadTaskNotesSheetSurface: vi.fn(),
}));

vi.mock("@beyo/task-working-sections", () => ({
  TaskWorkingSectionsField: probe("workingSections"),
  useTaskWorkingSectionsCountsFlow: () => ({ assignedCount: 0, isPending: false }),
}));

vi.mock("@beyo/upholstery", () => ({
  ItemUpholsteryField: probe("upholsteryField"),
  isUpholsteryRequirementState: () => false,
}));

vi.mock("../components/detail", () => ({
  TaskBodyCategoryRow: probe("categoryRow"),
  TaskCustomerSection: probe("customer"),
  TaskDetailBottomActions: probe("bottomActions"),
  TaskDetailHeader: probe("header"),
  TaskImagesSection: probe("images"),
  TaskScheduledDeliverySection: probe("schedule"),
  TaskUpholsterySection: (props: Record<string, unknown>) => {
    mocks.received.upholstery = props;
    const renderField = props.renderUpholsteryField as (input: unknown) => React.ReactNode;
    return (
      <div data-testid="probe-upholstery">
        {renderField({
          canHaveUpholstery: null,
          disabled: false,
          onCanHaveUpholsteryChange: undefined,
          onChange: vi.fn(),
          requirementState: null,
          testId: "upholstery-field-empty",
          value: null,
        })}
      </div>
    );
  },
}));

vi.mock("../components/TaskFlowTimeline", () => ({
  TaskFlowTimeline: probe("flowTimeline"),
}));

vi.mock("../providers/TaskDetailProvider", () => ({
  TaskDetailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTaskDetailContext: () => ({
    taskId: "tsk_1",
    taskDetail: {
      task: { client_id: "tsk_1", state: mocks.taskState, task_type: "pre_order" },
      item: { client_id: "itm_1", item_major_category_snapshot: "seat", can_have_upholstery: null },
    } as unknown as TaskDetailRaw,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    openMenu: mocks.openMenu,
    openReadyByAtSheet: mocks.openReadyByAtSheet,
    openPositionSheet: mocks.openPositionSheet,
    openQuantitySheet: mocks.openQuantitySheet,
    openCustomerDetailsSheet: mocks.openCustomerDetailsSheet,
    openWorkingSectionsSlide: mocks.openWorkingSectionsSlide,
    openDeliveryDateSheet: mocks.openDeliveryDateSheet,
    openAssortmentSheet: mocks.openAssortmentSheet,
    openFulfillmentMethodSheet: mocks.openFulfillmentMethodSheet,
    openUpholsteryAmountSheet: mocks.openUpholsteryAmountSheet,
    openFlowRecord: mocks.openFlowRecord,
    updateItem: { mutate: vi.fn() },
    createItemUpholstery: { mutate: vi.fn(), isPending: false },
    updateItemUpholstery: { mutate: vi.fn(), isPending: false },
    deleteItemUpholstery: { mutate: vi.fn(), isPending: false },
  }),
}));

import { TaskDetailSlidePage } from "./TaskDetailSlidePage";

const EDITOR_PROPS: Array<[probe: string, prop: string]> = [
  ["header", "onOpenReadyByAt"],
  ["categoryRow", "onOpenPositionField"],
  ["categoryRow", "onOpenQuantity"],
  ["customer", "onPress"],
  ["workingSections", "onOpenWorkingSections"],
  ["schedule", "onOpenDeliveryDate"],
  ["schedule", "onOpenAssortment"],
  ["schedule", "onOpenFulfillmentMethod"],
  ["upholstery", "onEditAmount"],
];

describe("TaskDetailSlidePage — role view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.received = {};
    mocks.taskState = "pending";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders read-only for a worker: no editors, no ⋮, no money, no Assign Stages", () => {
    mocks.role = "worker";
    render(<TaskDetailSlidePage />);

    for (const [probeName, prop] of EDITOR_PROPS) {
      expect(mocks.received[probeName]?.[prop], `${probeName}.${prop}`).toBeUndefined();
    }
    expect(mocks.received.header?.onOpenMenu).toBeUndefined();
    expect(screen.queryByTestId("probe-productionTime")).not.toBeInTheDocument();
    expect(mocks.received.bottomActions?.shouldRenderAssignStages).toBe(false);
    expect(mocks.received.images?.canEdit).toBe(false);
    expect(mocks.received.upholstery?.onCanHaveUpholsteryChange).toBeUndefined();
    expect(mocks.received.upholsteryField?.selectionDisabled).toBe(true);

    // Navigation stays live: the flow-record sheet and the back arrow.
    (mocks.received.flowTimeline?.onRecordPress as (id: string) => void)("rec_1");
    expect(mocks.openFlowRecord).toHaveBeenCalledWith("rec_1");
  });

  it("keeps every editor, the ⋮ and the production time for a manager", () => {
    mocks.role = "manager";
    render(<TaskDetailSlidePage />);

    for (const [probeName, prop] of EDITOR_PROPS) {
      expect(mocks.received[probeName]?.[prop], `${probeName}.${prop}`).toBeTypeOf("function");
    }
    (mocks.received.header?.onOpenMenu as () => void)();
    expect(mocks.openMenu).toHaveBeenCalledTimes(1);
    (mocks.received.categoryRow?.onOpenQuantity as () => void)();
    expect(mocks.openQuantitySheet).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe-productionTime")).toBeInTheDocument();
    expect(mocks.received.bottomActions?.shouldRenderAssignStages).toBe(true);
    expect(mocks.received.images?.canEdit).toBe(true);
    expect(mocks.received.upholsteryField?.selectionDisabled).toBe(false);
  });

  it("does not offer Assign Stages to a manager once the task has left pending", () => {
    mocks.role = "manager";
    mocks.taskState = "working";
    render(<TaskDetailSlidePage />);

    expect(mocks.received.bottomActions?.shouldRenderAssignStages).toBe(false);
    fireEvent.click(screen.getByTestId("probe-header"));
  });
});
