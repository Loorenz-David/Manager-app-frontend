import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// PriceHeadline closes its editor when the phone keyboard dismisses (owner
// round 7); the viewport state is driven per test through this holder.
const visualViewportState = vi.hoisted(() => ({ isKeyboardOpen: false }));
vi.mock("@beyo/hooks", () => ({
  useVisualViewport: () => ({
    isKeyboardOpen: visualViewportState.isKeyboardOpen,
    keyboardHeight: visualViewportState.isKeyboardOpen ? 300 : 0,
    viewportHeight: 800,
    offsetTop: 0,
  }),
}));

import { ItemValuationEmptyState } from "./ItemValuationEmptyState";
import { ItemValuationFooter } from "./ItemValuationFooter";
import { ItemValuationFrame } from "./ItemValuationFrame";
import { ItemValuationProvenanceRow } from "./ItemValuationProvenanceRow";
import { ItemValuationSkeleton } from "./ItemValuationSkeleton";
import { PriceCoverageChip } from "./PriceCoverageChip";
import { PriceHeadline } from "./PriceHeadline";
import { PriceSlider } from "./PriceSlider";
import { PurchaseBootstrapCard } from "./PurchaseBootstrapCard";
import { WorkImpactTable } from "./WorkImpactTable";
import {
  ESTIMATED_TYPICAL_TABLE,
  PRICE_EDITOR_FIXTURES,
  SAVED_BY_OTHER_PROVENANCE,
  UNKNOWN_AUTHOR_PROVENANCE,
  type PriceEditorFixture,
} from "./price-editor-fixtures";

afterEach(cleanup);

/** Compose a fixture the way the phase-2 page will: frame → header row → body. */
function renderScene(fixture: PriceEditorFixture): void {
  render(
    <ItemValuationFrame
      data-testid="item-valuation-scene"
      headerExtra={
        fixture.provenance ? (
          <ItemValuationProvenanceRow {...fixture.provenance} />
        ) : undefined
      }
      identity={fixture.frame.identity}
      title={fixture.frame.title}
    >
      <div className="flex flex-col gap-6 px-6 py-8">
        {fixture.headline ? <PriceHeadline {...fixture.headline} /> : null}
        {fixture.chip ? <PriceCoverageChip {...fixture.chip} /> : null}
        {fixture.slider ? <PriceSlider {...fixture.slider} /> : null}
        {fixture.table ? <WorkImpactTable {...fixture.table} /> : null}
        {fixture.bootstrap ? (
          <PurchaseBootstrapCard {...fixture.bootstrap} />
        ) : null}
        {fixture.empty ? <ItemValuationEmptyState {...fixture.empty} /> : null}
        {fixture.footer ? <ItemValuationFooter {...fixture.footer} /> : null}
      </div>
    </ItemValuationFrame>,
  );
}

describe("price editor scenes (criterion 51 — one row per closed fixture)", () => {
  it("1. editor-saved-pristine: muted saved price, Save disabled, Back to the abandoned draft", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-saved-pristine"]);
    expect(screen.getByTestId("item-valuation-per-piece")).toHaveTextContent(
      "1 625",
    );
    expect(screen.getByTestId("item-valuation-save-button")).toBeDisabled();
    expect(
      screen.getByTestId("item-valuation-back-to-saved"),
    ).toHaveTextContent("Back to 1 675");
    expect(screen.getByTestId("item-valuation-chip")).toHaveAttribute(
      "data-tone",
      "negative",
    );
  });

  it("2. editor-dirty: current-user row, Save enabled, positive coverage", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-dirty"]);
    expect(screen.getByTestId("item-valuation-provenance")).toHaveTextContent(
      "You",
    );
    expect(
      screen.getByTestId("item-valuation-back-to-saved"),
    ).toHaveTextContent("Back to 1 625");
    expect(screen.getByTestId("item-valuation-save-button")).toBeEnabled();
    expect(screen.getByTestId("item-valuation-chip")).toHaveAttribute(
      "data-tone",
      "positive",
    );
    expect(screen.getByTestId("item-valuation-at-price")).toHaveAttribute(
      "data-tone",
      "positive",
    );
  });

  it("3. editor-unpriced-pristine: dash avatar, ×4 detail, no Back button, Save enabled", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-unpriced-pristine"]);
    expect(screen.getByTestId("item-valuation-provenance")).toHaveTextContent(
      "No price set",
    );
    expect(screen.getByTestId("item-valuation-provenance")).toHaveTextContent(
      "suggested from purchase price × 4",
    );
    expect(
      screen.queryByTestId("item-valuation-back-to-saved"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("item-valuation-save-button")).toBeEnabled();
  });

  it("4. purchase-required: shimmer slot instead of a number, message, CTA enabled", () => {
    renderScene(PRICE_EDITOR_FIXTURES["purchase-required"]);
    expect(
      screen.queryByTestId("item-valuation-per-piece"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("item-valuation-bootstrap-message"),
    ).toHaveTextContent("nothing to price against");
    expect(screen.getByTestId("item-valuation-fetch-purchase")).toBeEnabled();
  });

  it("5. purchase-required-no-article: CTA disabled with the article-number message", () => {
    renderScene(PRICE_EDITOR_FIXTURES["purchase-required-no-article"]);
    expect(screen.getByTestId("item-valuation-fetch-purchase")).toBeDisabled();
    expect(
      screen.getByTestId("item-valuation-bootstrap-message"),
    ).toHaveTextContent("no article number");
  });

  it("6. bootstrap-pending: CTA disabled and busy", () => {
    renderScene(PRICE_EDITOR_FIXTURES["bootstrap-pending"]);
    const cta = screen.getByTestId("item-valuation-fetch-purchase");
    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute("aria-busy", "true");
  });

  it("7. bootstrap-error: the failure message renders above the CTA", () => {
    renderScene(PRICE_EDITOR_FIXTURES["bootstrap-error"]);
    expect(
      screen.getByTestId("item-valuation-bootstrap-error"),
    ).toHaveTextContent("purchase application");
    expect(screen.getByTestId("item-valuation-fetch-purchase")).toBeEnabled();
  });

  it("8. blocked: frame kept, status message, no numbers, Save disabled with a reason", () => {
    renderScene(PRICE_EDITOR_FIXTURES.blocked);
    expect(screen.getByTestId("item-valuation-empty-state")).toHaveTextContent(
      "configuration",
    );
    expect(
      screen.queryByTestId("item-valuation-per-piece"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("item-valuation-save-button")).toBeDisabled();
    expect(screen.getByTestId("item-valuation-save-reason")).toBeVisible();
  });

  it("9. unbound: frame kept, missing-item message, no Save at all", () => {
    renderScene(PRICE_EDITOR_FIXTURES.unbound);
    expect(screen.getByTestId("item-valuation-empty-state")).toHaveTextContent(
      "no item attached",
    );
    expect(
      screen.queryByTestId("item-valuation-save-button"),
    ).not.toBeInTheDocument();
  });

  it("10. editor-no-band: slider disabled AND its reason present", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-no-band"]);
    expect(screen.getByTestId("item-valuation-slider-input")).toBeDisabled();
    expect(screen.getByTestId("item-valuation-slider-reason")).toHaveTextContent(
      "No usable price band",
    );
  });

  it("11. editor-non-fundable: no chip, no marker, no use-suggested row", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-non-fundable"]);
    expect(screen.queryByTestId("item-valuation-chip")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("item-valuation-suggested-marker"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("item-valuation-use-suggested"),
    ).not.toBeInTheDocument();
  });

  it("11a. editor-infeasible: warning chip and a red headline, not 'Below typical work'", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-infeasible"]);

    const chip = screen.getByTestId("item-valuation-chip");
    expect(chip).toHaveTextContent("Too low to cover any work");
    expect(chip).not.toHaveTextContent("Below typical work");
    expect(chip).toHaveAttribute("data-warning", "true");
    expect(chip).toHaveAttribute("data-tone", "negative");

    // The headline carries the shortfall red — the signal the slider cannot
    // give, because a typed price sits outside the band it can render.
    expect(screen.getByTestId("item-valuation-per-piece").className).toContain(
      "text-[#b9382a]",
    );
  });

  it("11b. a merely-below-typical price keeps the milder chip, with no icon", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-unpriced-pristine"]);

    const chip = screen.getByTestId("item-valuation-chip");
    expect(chip).toHaveTextContent("Below typical work");
    expect(chip).not.toHaveAttribute("data-warning");
    expect(screen.getByTestId("item-valuation-per-piece").className).not.toContain(
      "text-[#b9382a]",
    );
  });

  it("12. editor-empty-typical: reason text, never a zero duration", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-empty-typical"]);
    const typical = screen.getByTestId("item-valuation-typical");
    expect(typical).toHaveTextContent("no completed work");
    expect(typical).not.toHaveTextContent("0m");
  });

  it("12a. estimated typical: a present value carries the estimated marker", () => {
    render(<WorkImpactTable {...ESTIMATED_TYPICAL_TABLE} />);
    const typical = screen.getByTestId("item-valuation-typical");
    expect(typical).toHaveTextContent("3h 25m");
    expect(typical).toHaveTextContent("estimated");
  });

  it("12b. another manager's saved version: named author with a profile image (r1 N5)", () => {
    render(<ItemValuationProvenanceRow {...SAVED_BY_OTHER_PROVENANCE} />);
    const row = screen.getByTestId("item-valuation-provenance");
    expect(row).toHaveTextContent("Marta Lind");
    expect(row).toHaveTextContent("saved version · 14 Aug, 10:24");
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.test/profiles/marta.jpg",
    );
    expect(
      screen.queryByTestId("item-valuation-back-to-saved"),
    ).not.toBeInTheDocument();
  });

  it("12c. unloadable author: empty avatar name, copy is 'saved version' alone (§3.5)", () => {
    render(<ItemValuationProvenanceRow {...UNKNOWN_AUTHOR_PROVENANCE} />);
    const row = screen.getByTestId("item-valuation-provenance");
    expect(row).toHaveTextContent("saved version");
    expect(row).not.toHaveTextContent("·");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("13. editor-cannot-commit: Save disabled with the reason visible", () => {
    renderScene(PRICE_EDITOR_FIXTURES["editor-cannot-commit"]);
    expect(screen.getByTestId("item-valuation-save-button")).toBeDisabled();
    expect(screen.getByTestId("item-valuation-save-reason")).toHaveTextContent(
      "finished",
    );
  });
});

describe("PriceSlider emissions (criteria 52–53)", () => {
  const baseProps = {
    stepCount: 82,
    tone: "positive" as const,
    markerFraction: null,
    markerLabel: null,
    minLabel: "700/pc",
    maxLabel: "2 750/pc",
  };

  it("emits exactly index / stepCount on change, never a price (criterion 52)", () => {
    const onFractionChange = vi.fn();
    render(
      <PriceSlider
        {...baseProps}
        fraction={0.5}
        onFractionChange={onFractionChange}
      />,
    );
    fireEvent.change(screen.getByTestId("item-valuation-slider-input"), {
      target: { value: "30" },
    });
    expect(onFractionChange).toHaveBeenCalledTimes(1);
    expect(onFractionChange).toHaveBeenCalledWith(30 / 82);
  });

  it("keyboard arrows move one index → ±1/stepCount (criterion 53)", () => {
    const onFractionChange = vi.fn();
    render(
      <PriceSlider
        {...baseProps}
        fraction={41 / 82}
        onFractionChange={onFractionChange}
      />,
    );
    const input = screen.getByTestId("item-valuation-slider-input");
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onFractionChange).toHaveBeenLastCalledWith(42 / 82);
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    expect(onFractionChange).toHaveBeenLastCalledWith(40 / 82);
    expect(onFractionChange).toHaveBeenCalledTimes(2);
  });

  it("clamps keyboard steps at the band ends", () => {
    const onFractionChange = vi.fn();
    render(
      <PriceSlider
        {...baseProps}
        fraction={1}
        onFractionChange={onFractionChange}
      />,
    );
    fireEvent.keyDown(screen.getByTestId("item-valuation-slider-input"), {
      key: "ArrowUp",
    });
    expect(onFractionChange).toHaveBeenCalledWith(1);
  });

  it("announces the formatted price via aria-valuetext, or nothing when absent (22g)", () => {
    render(
      <PriceSlider
        {...baseProps}
        ariaValueText="2 225 SEK per piece"
        fraction={0.5}
        onFractionChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("item-valuation-slider-input")).toHaveAttribute(
      "aria-valuetext",
      "2 225 SEK per piece",
    );
    cleanup();
    render(
      <PriceSlider {...baseProps} fraction={0.5} onFractionChange={vi.fn()} />,
    );
    expect(
      screen.getByTestId("item-valuation-slider-input"),
    ).not.toHaveAttribute("aria-valuetext");
  });

  it("opts out of slide-to-close on the slider alone (owner round 4)", () => {
    render(
      <PriceSlider {...baseProps} fraction={0.5} onFractionChange={vi.fn()} />,
    );
    expect(screen.getByTestId("item-valuation-slider")).toHaveAttribute(
      "data-slide-dismiss-ignore",
    );
  });

  it("renders an off-grid fraction without emitting anything", () => {
    const onFractionChange = vi.fn();
    render(
      <PriceSlider
        {...baseProps}
        fraction={438000 / 1230000}
        onFractionChange={onFractionChange}
      />,
    );
    expect(onFractionChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("item-valuation-slider-handle")).toBeVisible();
  });
});

describe("PriceHeadline tap-to-type (owner round 5)", () => {
  const baseHeadline = {
    perPiece: "4 524",
    currencyCode: "SEK",
    piecesLine: null,
    purchaseLine: null,
  };

  beforeEach(() => {
    visualViewportState.isKeyboardOpen = false;
  });

  it("closes the editor when the phone keyboard dismisses (owner round 7)", () => {
    const onPerPieceCommit = vi.fn();
    const view = render(
      <PriceHeadline
        {...baseHeadline}
        perPieceDigits="4524"
        onPerPieceCommit={onPerPieceCommit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /edit expected sold price/i }),
    );
    expect(
      screen.getByTestId("item-valuation-per-piece-input"),
    ).toBeInTheDocument();

    visualViewportState.isKeyboardOpen = true;
    view.rerender(
      <PriceHeadline
        {...baseHeadline}
        perPieceDigits="4524"
        onPerPieceCommit={onPerPieceCommit}
      />,
    );
    // Keyboard open: still editing.
    expect(
      screen.getByTestId("item-valuation-per-piece-input"),
    ).toBeInTheDocument();

    visualViewportState.isKeyboardOpen = false;
    view.rerender(
      <PriceHeadline
        {...baseHeadline}
        perPieceDigits="4524"
        onPerPieceCommit={onPerPieceCommit}
      />,
    );
    expect(
      screen.queryByTestId("item-valuation-per-piece-input"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("item-valuation-per-piece")).toBeInTheDocument();
  });

  it("tap opens a numeric editor seeded with the current digits, grouped", () => {
    render(
      <PriceHeadline
        {...baseHeadline}
        perPieceDigits="4524"
        onPerPieceCommit={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /edit expected sold price/i }),
    );
    const input = screen.getByTestId("item-valuation-per-piece-input");
    expect(input).toHaveValue("4 524");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("typing regroups thousands and propagates every keystroke live (owner round 6)", () => {
    const onPerPieceCommit = vi.fn();
    render(
      <PriceHeadline
        {...baseHeadline}
        perPieceDigits="4524"
        onPerPieceCommit={onPerPieceCommit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /edit expected sold price/i }),
    );
    const input = screen.getByTestId("item-valuation-per-piece-input");
    fireEvent.change(input, { target: { value: "12" } });
    expect(onPerPieceCommit).toHaveBeenLastCalledWith(12);
    fireEvent.change(input, { target: { value: "12345" } });
    expect(input).toHaveValue("12\u00a0345");
    expect(onPerPieceCommit).toHaveBeenLastCalledWith(12345);
    // Blur only closes the editor — the value is already live.
    fireEvent.blur(input);
    expect(onPerPieceCommit).toHaveBeenCalledTimes(2);
  });

  it("an emptied field emits nothing; Escape restores the edit's starting value", () => {
    const onPerPieceCommit = vi.fn();
    render(
      <PriceHeadline
        {...baseHeadline}
        perPieceDigits="4524"
        onPerPieceCommit={onPerPieceCommit}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /edit expected sold price/i }),
    );
    const input = screen.getByTestId("item-valuation-per-piece-input");
    fireEvent.change(input, { target: { value: "" } });
    expect(onPerPieceCommit).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "9000" } });
    expect(onPerPieceCommit).toHaveBeenLastCalledWith(9000);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onPerPieceCommit).toHaveBeenLastCalledWith(4524);
    expect(screen.getByTestId("item-valuation-per-piece")).toBeInTheDocument();
  });

  it("without an editor wiring, the amount stays a plain display", () => {
    render(<PriceHeadline {...baseHeadline} />);
    expect(
      screen.queryByRole("button", { name: /edit expected sold price/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("item-valuation-per-piece")).toHaveTextContent(
      "4 524",
    );
  });
});

describe("interaction wiring", () => {
  it("Back button fires onBackPress", () => {
    const onBackPress = vi.fn();
    render(
      <ItemValuationProvenanceRow
        avatarKind="user"
        avatarName="You"
        backLabel="Back to 1 625"
        detail="unsaved change · just now"
        label="You"
        onBackPress={onBackPress}
      />,
    );
    fireEvent.click(screen.getByTestId("item-valuation-back-to-saved"));
    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it("Save and use-suggested fire their callbacks; a pending save fires nothing", () => {
    const onSavePress = vi.fn();
    const onSuggestedPress = vi.fn();
    render(
      <ItemValuationFooter
        isSaveDisabled={false}
        saveLabel="Save 2 225 SEK / pc"
        suggestedLabel="Use suggested 2 025 SEK / pc"
        onSavePress={onSavePress}
        onSuggestedPress={onSuggestedPress}
      />,
    );
    fireEvent.click(screen.getByTestId("item-valuation-save-button"));
    fireEvent.click(screen.getByTestId("item-valuation-use-suggested"));
    expect(onSavePress).toHaveBeenCalledTimes(1);
    expect(onSuggestedPress).toHaveBeenCalledTimes(1);

    cleanup();
    const onPendingSave = vi.fn();
    render(
      <ItemValuationFooter
        isSaveDisabled={false}
        isSavePending
        saveLabel="Save 2 225 SEK / pc"
        suggestedLabel={null}
        onSavePress={onPendingSave}
      />,
    );
    fireEvent.click(screen.getByTestId("item-valuation-save-button"));
    expect(onPendingSave).not.toHaveBeenCalled();
  });

  it("the frame owns the header stack: arrow + identity, no menu button", () => {
    const onBackPress = vi.fn();
    render(
      <ItemValuationFrame
        identity={{ articleNumber: "0000608", detail: null }}
        title="Expected sold price"
        onBackPress={onBackPress}
      >
        <ItemValuationSkeleton />
      </ItemValuationFrame>,
    );
    expect(screen.getByTestId("item-valuation-skeleton")).toBeVisible();
    const frameHeader = screen.getByTestId("item-valuation-header");
    // The identity renders in place of the title (owner redesign
    // 2026-08-24); the title survives as the heading's accessible name.
    expect(screen.getByRole("heading", { name: "Expected sold price" })).toBe(
      frameHeader.querySelector("h1"),
    );
    expect(frameHeader).toHaveTextContent("#0000608");
    expect(frameHeader).not.toHaveTextContent("Expected sold price");
    // Owner redesign round 3: the frame's own back arrow wires to the surface
    // close funnel; the decorative three-dot stays gone.
    fireEvent.click(screen.getByTestId("item-valuation-back-arrow"));
    expect(onBackPress).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId("item-valuation-menu-button"),
    ).not.toBeInTheDocument();
  });

  it("the frame falls back to the visible title when there is no identity", () => {
    render(
      <ItemValuationFrame identity={null} title="Expected sold price">
        <ItemValuationSkeleton />
      </ItemValuationFrame>,
    );
    expect(
      screen.getByTestId("item-valuation-header"),
    ).toHaveTextContent("Expected sold price");
  });

  it("weights the article number bold and the type/quantity light, with a leading #", () => {
    render(
      <ItemValuationFrame
        identity={{ articleNumber: "0000608", detail: "DINING CHAIRS (6)" }}
        title="Expected sold price"
      >
        <ItemValuationSkeleton />
      </ItemValuationFrame>,
    );
    const frameHeader = screen.getByTestId("item-valuation-header");
    expect(frameHeader).toHaveTextContent("#0000608 · DINING CHAIRS (6)");
    const detail = screen.getByText(/DINING CHAIRS \(6\)/);
    expect(detail).toHaveClass("font-normal");
  });
});
