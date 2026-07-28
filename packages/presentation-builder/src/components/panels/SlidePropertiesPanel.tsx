import { ColorSwatchPicker } from "@beyo/ui";

import {
  PanelFieldLabel,
  PanelHeading,
  PanelHint,
  PanelSection,
  PanelSlider,
} from "./PanelPrimitives";
import {
  PanelDrawer,
  SLIDE_PANEL_DRAWERS,
  type PanelDrawersProp,
} from "./PanelDrawer";

type SlidePropertiesPanelProps = {
  onReplaceMedia: () => void;
  durationSeconds: number;
  onDurationChange: (seconds: number) => void;
  /** Formatted duration for the editable field (the slider handle only spans 2–12 s). */
  durationLabel?: string;
  /** Raw typed duration, parsed by the logic layer — supports values past the handle. */
  onDurationLabelCommit?: (rawValue: string) => void;
  /** Slide background color (hex, null = none). Field renders only when wired
   * (slide-background-color plan). */
  backgroundColor?: string | null;
  onBackgroundColorChange?: (value: string | null) => void;
  ctaLabel: string;
  onCtaLabelChange: (value: string) => void;
  ctaRoute: string;
  onCtaRouteChange: (value: string) => void;
  /** Commit point for CTA persistence (blur on either field). */
  onCtaCommit: () => void;
  /** Validation error under the route field (e.g. "Must start with /"). */
  ctaRouteError?: string | null;
  /** Collapsible tool groups (media / timing / background / button). Absent → flat. */
  drawers?: PanelDrawersProp;
  readOnly?: boolean;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-[#dcdcdc] bg-white px-2.5 py-2 text-[13px] text-[#303030] placeholder:text-[#9a9a9a] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** Right-panel state when no element is selected: slide-level properties. */
export function SlidePropertiesPanel({
  onReplaceMedia,
  durationSeconds,
  onDurationChange,
  durationLabel,
  onDurationLabelCommit,
  backgroundColor,
  onBackgroundColorChange,
  ctaLabel,
  onCtaLabelChange,
  ctaRoute,
  onCtaRouteChange,
  onCtaCommit,
  ctaRouteError,
  drawers,
  readOnly,
}: SlidePropertiesPanelProps): React.JSX.Element {
  const group = (
    id: string,
    title: string,
    children: React.ReactNode,
    errorBadge?: string,
  ) =>
    drawers ? (
      <PanelDrawer
        id={id}
        title={title}
        isOpen={drawers.open.includes(id)}
        onToggle={() => drawers.onToggle(id)}
        errorBadge={errorBadge}
      >
        {children}
      </PanelDrawer>
    ) : (
      <>{children}</>
    );

  return (
    <div className="p-4" data-testid="presentation-panel-slide">
      <PanelHeading>Slide</PanelHeading>
      {!readOnly &&
        group(SLIDE_PANEL_DRAWERS.media, "Media", (
          <PanelSection>
            <button
              type="button"
              onClick={onReplaceMedia}
              data-testid="presentation-panel-replace-media-button"
              className="w-full rounded-lg border-[1.5px] border-dashed border-[#cdcdcd] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#767676] transition-colors duration-150 hover:border-[#9a9a9a] hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
            >
              ↥ Replace image/video
            </button>
          </PanelSection>
        ))}
      {group(SLIDE_PANEL_DRAWERS.timing, "Timing", (
        <PanelSection>
          <PanelSlider
            label="Slide duration"
            valueLabel={durationLabel ?? `${durationSeconds.toFixed(1)}s`}
            min={2}
            max={12}
            step={0.5}
            value={durationSeconds}
            onChange={onDurationChange}
            onValueLabelCommit={onDurationLabelCommit}
            valueLabelHint="Type any length — 8, 90s, 1:30, 2m"
            disabled={readOnly}
            testId="presentation-panel-slide-duration"
          />
        </PanelSection>
      ))}
      {onBackgroundColorChange &&
        group(SLIDE_PANEL_DRAWERS.background, "Background", (
          <PanelSection>
            <PanelFieldLabel>Background color</PanelFieldLabel>
            <ColorSwatchPicker
              value={backgroundColor ?? undefined}
              onChange={(value) => onBackgroundColorChange(value ?? null)}
              allowNone
              disabled={readOnly}
              ariaLabel="Slide background color"
              testId="presentation-panel-slide-background-color"
            />
          </PanelSection>
        ))}
      {group(
        SLIDE_PANEL_DRAWERS.button,
        "Button",
        <>
          <PanelSection>
            <PanelFieldLabel>Button label (optional)</PanelFieldLabel>
            <input
              type="text"
              value={ctaLabel}
              onChange={(event) => onCtaLabelChange(event.target.value)}
              onBlur={onCtaCommit}
              disabled={readOnly}
              placeholder="Try product search"
              aria-label="Call-to-action label"
              data-testid="presentation-panel-cta-label"
              className={INPUT_CLASS}
            />
          </PanelSection>
          <PanelSection>
            <PanelFieldLabel>Button link (in-app path)</PanelFieldLabel>
            <input
              type="text"
              value={ctaRoute}
              onChange={(event) => onCtaRouteChange(event.target.value)}
              onBlur={onCtaCommit}
              disabled={readOnly}
              placeholder="/products/search"
              aria-label="Call-to-action route"
              data-testid="presentation-panel-cta-route"
              className={INPUT_CLASS}
            />
            {ctaRouteError && (
              <p className="mt-1 text-xs text-[#c05a5a]" data-testid="presentation-panel-cta-route-error">
                {ctaRouteError}
              </p>
            )}
          </PanelSection>
        </>,
        ctaRouteError ?? undefined,
      )}
      <PanelHint>Select a text block or media bar to edit its timing and animation.</PanelHint>
    </div>
  );
}
