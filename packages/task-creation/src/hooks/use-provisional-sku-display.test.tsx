import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useProvisionalSkuDisplay } from "./use-provisional-sku-display";

describe("useProvisionalSkuDisplay", () => {
  it("seeds with the preview when nothing was typed", () => {
    const { result } = renderHook(() => useProvisionalSkuDisplay());

    act(() => {
      result.current.beginSubmission(undefined, "RET-7");
    });

    expect(result.current.submittedSku).toEqual({
      value: "RET-7",
      isProvisional: true,
    });
  });

  it("seeds with the override, marked final, ignoring the preview", () => {
    const { result } = renderHook(() => useProvisionalSkuDisplay());

    act(() => {
      result.current.beginSubmission("CUSTOM-7", "RET-7");
    });

    expect(result.current.submittedSku).toEqual({
      value: "CUSTOM-7",
      isProvisional: false,
    });
  });

  it("has nothing to show without an override or an applicable preview", () => {
    const { result } = renderHook(() => useProvisionalSkuDisplay());

    act(() => {
      result.current.beginSubmission(undefined, null);
    });

    expect(result.current.submittedSku).toEqual({
      value: "",
      isProvisional: true,
    });
  });

  it("swaps to the final sku once the response lands", () => {
    const { result } = renderHook(() => useProvisionalSkuDisplay());

    act(() => {
      result.current.beginSubmission(undefined, "RET-7");
    });
    act(() => {
      result.current.resolveFinal("RET-9");
    });

    expect(result.current.submittedSku).toEqual({
      value: "RET-9",
      isProvisional: false,
    });
  });

  it("leaves the display untouched when the response carries no sku", () => {
    const { result } = renderHook(() => useProvisionalSkuDisplay());

    act(() => {
      result.current.beginSubmission("CUSTOM-7", null);
    });
    act(() => {
      result.current.resolveFinal(null);
    });

    expect(result.current.submittedSku).toEqual({
      value: "CUSTOM-7",
      isProvisional: false,
    });
  });

  it("clears back to nothing", () => {
    const { result } = renderHook(() => useProvisionalSkuDisplay());

    act(() => {
      result.current.beginSubmission(undefined, "RET-7");
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.submittedSku).toBeNull();
  });
});
