import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useItemUpholsteryQueryMock = vi.fn();

vi.mock("../../api/use-item-upholstery-query", () => ({
  useItemUpholsteryQuery: () => useItemUpholsteryQueryMock(),
}));

import { TaskUpholsterySection } from "./TaskUpholsterySection";

const LINKED_ENTRY = {
  client_id: "iup_1",
  item_id: "itm_1",
  upholstery_id: "uph_a",
  name: "Alba",
  code: "AL-1",
  image_url: null,
  amount_meters: 4,
  source: "internal",
  time_to_fix_in_seconds: null,
  active_requirement_id: null,
};

type RenderInput = Parameters<
  React.ComponentProps<typeof TaskUpholsterySection>["renderUpholsteryField"]
>[0];

function renderSection(
  props: Partial<React.ComponentProps<typeof TaskUpholsterySection>> = {},
) {
  const captured: RenderInput[] = [];

  render(
    <TaskUpholsterySection
      itemId="itm_1"
      onCreate={vi.fn()}
      onEditAmount={vi.fn()}
      onUpdate={vi.fn()}
      renderUpholsteryField={(input) => {
        captured.push(input);
        return <div data-testid={input.testId} />;
      }}
      {...props}
    />,
  );

  return captured;
}

describe("TaskUpholsterySection", () => {
  beforeEach(() => {
    useItemUpholsteryQueryMock.mockReturnValue({
      data: { upholstery: [], requirements: [] },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("passes the flag and its handler down to the field", () => {
    const onCanHaveUpholsteryChange = vi.fn();
    const captured = renderSection({
      canHaveUpholstery: false,
      onCanHaveUpholsteryChange,
    });

    expect(captured[0]).toMatchObject({
      canHaveUpholstery: false,
      onCanHaveUpholsteryChange,
    });
  });

  it("drops the empty-state copy once the item is marked as no upholstery", () => {
    renderSection({ canHaveUpholstery: false });

    expect(screen.queryByText("No upholstery linked yet.")).not.toBeInTheDocument();
  });

  it("keeps the empty-state copy while the flag is unrecorded", () => {
    renderSection();

    expect(screen.getByText("No upholstery linked yet.")).toBeVisible();
  });

  it("ignores a cleared selection when nothing is linked", () => {
    const onCreate = vi.fn();
    const captured = renderSection({ onCreate });

    captured[0]!.onChange(null);

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates from a picked upholstery when nothing is linked", () => {
    const onCreate = vi.fn();
    const captured = renderSection({ onCreate });

    captured[0]!.onChange("uph_a");

    expect(onCreate).toHaveBeenCalledWith("uph_a");
  });

  describe("with a linked upholstery", () => {
    beforeEach(() => {
      useItemUpholsteryQueryMock.mockReturnValue({
        data: { upholstery: [LINKED_ENTRY], requirements: [] },
      });
    });

    it("removes the link when the selection is cleared", () => {
      const onRemove = vi.fn();
      const onUpdate = vi.fn();
      const captured = renderSection({ onRemove, onUpdate });

      captured[0]!.onChange(null);

      expect(onRemove).toHaveBeenCalledWith("iup_1");
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("swaps on a different upholstery and ignores the same one", () => {
      const onUpdate = vi.fn();
      const captured = renderSection({ onUpdate });

      captured[0]!.onChange("uph_a");
      expect(onUpdate).not.toHaveBeenCalled();

      captured[0]!.onChange("uph_b");
      expect(onUpdate).toHaveBeenCalledWith("iup_1", "uph_b");
    });
  });
});
