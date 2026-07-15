import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UpholsterySearch } from "./UpholsterySearch";

function ControlledHarness({
  onChange,
}: {
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <UpholsterySearch
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("UpholsterySearch", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a controlled empty search input", () => {
    render(<UpholsterySearch value="" onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("forwards input changes through onChange", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<ControlledHarness onChange={handleChange} />);

    await user.type(screen.getByRole("searchbox"), "linen");

    expect(handleChange).toHaveBeenCalled();
    expect(handleChange).toHaveBeenLastCalledWith("linen");
  });

  it("shows the existing search placeholder", () => {
    render(<UpholsterySearch value="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search upholstery")).toBeVisible();
  });
});
