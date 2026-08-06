import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { ScrollVisibilityProvider } from "@beyo/ui";
import type { WorkingSectionOption } from "@beyo/working-sections";

import { TaskCreationAssignmentFooter } from "./TaskCreationAssignmentFooter";

const useWorkingSectionPickerFlowMock = vi.fn();

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");

  return {
    ...actual,
    // Navigation isn't under test here and needs a real <StagedForm> ancestor.
    StagedFormNavigation: () => null,
  };
});

vi.mock("@beyo/working-sections", async () => {
  const actual =
    await vi.importActual<typeof import("@beyo/working-sections")>(
      "@beyo/working-sections",
    );

  return {
    ...actual,
    useWorkingSectionPickerFlow: () => useWorkingSectionPickerFlowMock(),
  };
});

vi.mock("@beyo/hooks", async () => {
  const actual = await vi.importActual<typeof import("@beyo/hooks")>(
    "@beyo/hooks",
  );

  return {
    ...actual,
    useSurfaceHeader: () => null,
  };
});

const CLEANING_SECTION: WorkingSectionOption = {
  client_id: "ws_cleaning",
  name: "Cleaning",
  image: null,
  dependencies: [],
  item_categories: [
    { client_id: "itc_1", name: "Chair", major_category: "seat" },
  ],
  supported_issue_types: [],
  members: [],
};

const PHOTOGRAPHY_SECTION: WorkingSectionOption = {
  client_id: "ws_photography",
  name: "Photography",
  image: null,
  dependencies: [],
  item_categories: [],
  supported_issue_types: [],
  members: [],
};

function SelectionProbe(): React.JSX.Element {
  const selection = useWatch({ name: "working_section_assignments" }) as
    | Array<{ working_section_id: string }>
    | undefined;

  return (
    <output data-testid="selection-probe">
      {(selection ?? []).map((entry) => entry.working_section_id).join(",")}
    </output>
  );
}

function Harness({
  taskType,
}: {
  taskType: string;
}): React.JSX.Element {
  const methods = useForm({
    defaultValues: { working_section_assignments: [] },
  });

  return (
    <ScrollVisibilityProvider scrollElement={null}>
      <FormProvider {...methods}>
        <SelectionProbe />
        <TaskCreationAssignmentFooter
          activeStepId="assignment"
          majorCategory="seat"
          taskType={taskType}
        />
      </FormProvider>
    </ScrollVisibilityProvider>
  );
}

describe("TaskCreationAssignmentFooter — photography by task type", () => {
  it("includes the photography section in Full job for internal tasks", () => {
    useWorkingSectionPickerFlowMock.mockReturnValue({
      options: [CLEANING_SECTION, PHOTOGRAPHY_SECTION],
      isLoading: false,
    });

    render(<Harness taskType="internal" />);

    fireEvent.click(screen.getByTestId("shortcut-pill-full-job"));

    expect(screen.getByTestId("selection-probe").textContent).toContain(
      "ws_photography",
    );
    expect(screen.getByTestId("selection-probe").textContent).toContain(
      "ws_cleaning",
    );
  });

  it("drops the photography section from Full job for pre_order tasks", () => {
    useWorkingSectionPickerFlowMock.mockReturnValue({
      options: [CLEANING_SECTION, PHOTOGRAPHY_SECTION],
      isLoading: false,
    });

    render(<Harness taskType="pre_order" />);

    fireEvent.click(screen.getByTestId("shortcut-pill-full-job"));

    expect(screen.getByTestId("selection-probe").textContent).not.toContain(
      "ws_photography",
    );
    expect(screen.getByTestId("selection-probe").textContent).toContain(
      "ws_cleaning",
    );
  });

  it("drops the photography section from Full job for return tasks", () => {
    useWorkingSectionPickerFlowMock.mockReturnValue({
      options: [CLEANING_SECTION, PHOTOGRAPHY_SECTION],
      isLoading: false,
    });

    render(<Harness taskType="return" />);

    fireEvent.click(screen.getByTestId("shortcut-pill-full-job"));

    expect(screen.getByTestId("selection-probe").textContent).not.toContain(
      "ws_photography",
    );
  });
});
