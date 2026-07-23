import { ColorSwatchPicker } from "@beyo/ui";

import {
  PanelFieldLabel,
  PanelHeading,
  PanelHint,
  PanelSection,
  PanelSlider,
} from "./PanelPrimitives";

type SlidePropertiesPanelProps = {
  onReplaceMedia: () => void;
  durationSeconds: number;
  onDurationChange: (seconds: number) => void;
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
  readOnly?: boolean;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-[#dcdcdc] bg-white px-2.5 py-2 text-[13px] text-[#303030] placeholder:text-[#9a9a9a] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** Right-panel state when no element is selected: slide-level properties. */
export function SlidePropertiesPanel({
  onReplaceMedia,
  durationSeconds,
  onDurationChange,
  backgroundColor,
  onBackgroundColorChange,
  ctaLabel,
  onCtaLabelChange,
  ctaRoute,
  onCtaRouteChange,
  onCtaCommit,
  ctaRouteError,
  readOnly,
}: SlidePropertiesPanelProps): React.JSX.Element {
  return (
    <div className="p-4" data-testid="presentation-panel-slide">
      <PanelHeading>Slide</PanelHeading>
      {!readOnly && (
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
      )}
      <PanelSection>
        <PanelSlider
          label="Slide duration"
          valueLabel={`${durationSeconds.toFixed(1)}s`}
          min={2}
          max={12}
          step={0.5}
          value={durationSeconds}
          onChange={onDurationChange}
          disabled={readOnly}
          testId="presentation-panel-slide-duration"
        />
      </PanelSection>
      {onBackgroundColorChange && (
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
      )}
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
      <PanelHint>Select a text block or media bar to edit its timing and animation.</PanelHint>
    </div>
  );
}
