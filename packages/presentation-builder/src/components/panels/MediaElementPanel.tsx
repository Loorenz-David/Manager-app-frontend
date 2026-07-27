import {
  PanelDeleteButton,
  PanelFieldLabel,
  PanelHeaderRow,
  PanelSection,
  SegmentedControl,
} from "./PanelPrimitives";
import { ANIMATION_OPTIONS, type AnimationChoice } from "./animation-options";
import {
  MEDIA_PANEL_DRAWERS,
  PanelDrawer,
  type PanelDrawersProp,
} from "./PanelDrawer";

export type MediaFitChoice = "cover" | "contain" | "fill";

const FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
] as const;

type MediaElementPanelProps = {
  /** e.g. "VIDEO · demo.mp4" — preformatted. */
  mediaLabel: string;
  fit: MediaFitChoice;
  onFitChange: (value: MediaFitChoice) => void;
  /** In/out transitions. Sections render only when wired (timeline/media Stage C). */
  appears?: AnimationChoice;
  onAppearsChange?: (value: AnimationChoice) => void;
  disappears?: AnimationChoice;
  onDisappearsChange?: (value: AnimationChoice) => void;
  /** Preformatted size/position readout, e.g. "100% × 56% at 50%, 32%". */
  geometryLabel?: string;
  /** Collapsible tool groups (media / animations). Absent → flat. */
  drawers?: PanelDrawersProp;
  /** e.g. "On screen 0.0s → 4.0s". */
  windowLabel: string;
  onReplace: () => void;
  onDelete: () => void;
  /** Deselects the element — the panel returns to slide settings. */
  onClose: () => void;
  readOnly?: boolean;
};

/** Right-panel state when a timed media element is selected. */
export function MediaElementPanel({
  mediaLabel,
  fit,
  onFitChange,
  appears,
  onAppearsChange,
  disappears,
  onDisappearsChange,
  geometryLabel,
  drawers,
  windowLabel,
  onReplace,
  onDelete,
  onClose,
  readOnly,
}: MediaElementPanelProps): React.JSX.Element {
  const group = (id: string, title: string, children: React.ReactNode) =>
    drawers ? (
      <PanelDrawer
        id={id}
        title={title}
        isOpen={drawers.open.includes(id)}
        onToggle={() => drawers.onToggle(id)}
      >
        {children}
      </PanelDrawer>
    ) : (
      <>{children}</>
    );

  const fitSection = (
    <PanelSection>
      <PanelFieldLabel>Fit</PanelFieldLabel>
      <SegmentedControl
        options={FIT_OPTIONS}
        value={fit}
        onChange={onFitChange}
        disabled={readOnly}
        ariaLabel="Media fit"
        testId="presentation-panel-media-fit"
      />
    </PanelSection>
  );
  const animationSections = (
    <>
      {appears !== undefined && onAppearsChange && (
        <PanelSection>
          <PanelFieldLabel>Appears</PanelFieldLabel>
          <SegmentedControl
            options={ANIMATION_OPTIONS}
            value={appears}
            onChange={onAppearsChange}
            disabled={readOnly}
            ariaLabel="Appear animation"
            testId="presentation-panel-media-appears"
          />
        </PanelSection>
      )}
      {disappears !== undefined && onDisappearsChange && (
        <PanelSection>
          <PanelFieldLabel>Disappears</PanelFieldLabel>
          <SegmentedControl
            options={ANIMATION_OPTIONS}
            value={disappears}
            onChange={onDisappearsChange}
            disabled={readOnly}
            ariaLabel="Disappear animation"
            testId="presentation-panel-media-disappears"
          />
        </PanelSection>
      )}
    </>
  );
  const replaceSection = !readOnly && (
    <PanelSection>
      <button
        type="button"
        onClick={onReplace}
        data-testid="presentation-panel-media-replace-button"
        className="w-full rounded-lg border-[1.5px] border-dashed border-[#cdcdcd] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#767676] transition-colors duration-150 hover:border-[#9a9a9a] hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
      >
        ↥ Replace file
      </button>
    </PanelSection>
  );

  return (
    <div className="p-4" data-testid="presentation-panel-media-element">
      <PanelHeaderRow
        heading="Media"
        onClose={onClose}
        closeTestId="presentation-panel-media-close-button"
      />
      <p className="mt-2 truncate font-mono text-[11px] text-[#767676]">{mediaLabel}</p>
      {drawers ? (
        <>
          {group(MEDIA_PANEL_DRAWERS.media, "Media", (
            <>
              {fitSection}
              {replaceSection}
            </>
          ))}
          {group(MEDIA_PANEL_DRAWERS.animations, "Animations", animationSections)}
        </>
      ) : (
        <>
          {fitSection}
          {animationSections}
        </>
      )}
      {geometryLabel && (
        <p
          className="mt-3 font-mono text-[11px] text-[#767676]"
          data-testid="presentation-panel-media-geometry"
        >
          {geometryLabel}
        </p>
      )}
      {!drawers && replaceSection}
      <p className="mt-4 text-xs text-[#9a9a9a]">{windowLabel}</p>
      {!readOnly && (
        <PanelDeleteButton
          label="Delete media"
          onClick={onDelete}
          testId="presentation-panel-delete-media-button"
        />
      )}
    </div>
  );
}
