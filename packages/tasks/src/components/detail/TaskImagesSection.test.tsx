import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const received = vi.hoisted(() => ({
  provider: {} as Record<string, unknown>,
  grid: {} as Record<string, unknown>,
}));

vi.mock("@beyo/images", () => ({
  EntityImagesProvider: ({ children, ...props }: { children: React.ReactNode }) => {
    received.provider = props;
    return <div data-testid="probe-provider">{children}</div>;
  },
  ImagePreviewGrid: (props: Record<string, unknown>) => {
    received.grid = props;
    return <div data-testid="probe-grid" />;
  },
}));

import { TaskImagesSection } from "./TaskImagesSection";

describe("TaskImagesSection", () => {
  beforeEach(() => {
    received.provider = {};
    received.grid = {};
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts an editable grid and viewer by default", () => {
    render(<TaskImagesSection itemId="itm_1" onImagesChanged={vi.fn()} />);

    expect(received.grid.readOnly).toBe(false);
    expect(received.provider.viewerMode).toBeUndefined();
  });

  it("locks the grid and the viewer when editing is not allowed", () => {
    render(<TaskImagesSection canEdit={false} itemId="itm_1" onImagesChanged={vi.fn()} />);

    expect(received.grid.readOnly).toBe(true);
    expect(received.provider.viewerMode).toBe("preview-only");
  });

  it("explains a missing item instead of mounting the provider", () => {
    render(<TaskImagesSection canEdit={false} itemId={null} onImagesChanged={vi.fn()} />);

    expect(screen.getByText("No item is linked to this task.")).toBeInTheDocument();
    expect(screen.queryByTestId("probe-provider")).not.toBeInTheDocument();
  });
});
