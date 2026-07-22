import {
  PanelDeleteButton,
  PanelFieldLabel,
  PanelHeaderRow,
  PanelSection,
  PanelSlider,
  SegmentedControl,
} from "./PanelPrimitives";

export type TextAnimationChoice = "fade" | "slide" | "none";

const ANIMATION_OPTIONS = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "none", label: "None" },
] as const;

const STYLE_ROLE_OPTIONS = [
  { value: "body", label: "Body" },
  { value: "heading", label: "Heading" },
] as const;

type TextBlockPanelProps = {
  content: string;
  onContentChange: (value: string) => void;
  /** Commit point for persistence (blur). */
  onContentCommit: (value: string) => void;
  appears: TextAnimationChoice;
  onAppearsChange: (value: TextAnimationChoice) => void;
  disappears: TextAnimationChoice;
  onDisappearsChange: (value: TextAnimationChoice) => void;
  sizePx: number;
  onSizeChange: (value: number) => void;
  styleRole: "body" | "heading";
  onStyleRoleChange: (value: "body" | "heading") => void;
  /** e.g. "On screen 0.4s → 3.4s". */
  windowLabel: string;
  onDelete: () => void;
  /** Deselects the element — the panel returns to slide settings. */
  onClose: () => void;
  readOnly?: boolean;
};

/** Right-panel state when a text block is selected. */
export function TextBlockPanel({
  content,
  onContentChange,
  onContentCommit,
  appears,
  onAppearsChange,
  disappears,
  onDisappearsChange,
  sizePx,
  onSizeChange,
  styleRole,
  onStyleRoleChange,
  windowLabel,
  onDelete,
  onClose,
  readOnly,
}: TextBlockPanelProps): React.JSX.Element {
  return (
    <div className="p-4" data-testid="presentation-panel-text-block">
      <PanelHeaderRow
        heading="Text block"
        onClose={onClose}
        closeTestId="presentation-panel-text-close-button"
      />
      <PanelSection>
        <PanelFieldLabel>Content</PanelFieldLabel>
        <textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          onBlur={(event) => onContentCommit(event.target.value)}
          disabled={readOnly}
          rows={3}
          aria-label="Text content"
          data-testid="presentation-panel-text-content"
          className="w-full resize-y rounded-lg border border-[#dcdcdc] bg-white px-2.5 py-2 text-[13px] leading-5 text-[#303030] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </PanelSection>
      <PanelSection>
        <PanelFieldLabel>Appears</PanelFieldLabel>
        <SegmentedControl
          options={ANIMATION_OPTIONS}
          value={appears}
          onChange={onAppearsChange}
          disabled={readOnly}
          ariaLabel="Appear animation"
          testId="presentation-panel-appears"
        />
      </PanelSection>
      <PanelSection>
        <PanelFieldLabel>Disappears</PanelFieldLabel>
        <SegmentedControl
          options={ANIMATION_OPTIONS}
          value={disappears}
          onChange={onDisappearsChange}
          disabled={readOnly}
          ariaLabel="Disappear animation"
          testId="presentation-panel-disappears"
        />
      </PanelSection>
      <PanelSection>
        <PanelSlider
          label="Size"
          valueLabel={`${sizePx}px`}
          min={12}
          max={52}
          step={1}
          value={sizePx}
          onChange={onSizeChange}
          disabled={readOnly}
          testId="presentation-panel-text-size"
        />
      </PanelSection>
      <PanelSection>
        <PanelFieldLabel>Style</PanelFieldLabel>
        <SegmentedControl
          options={STYLE_ROLE_OPTIONS}
          value={styleRole}
          onChange={onStyleRoleChange}
          disabled={readOnly}
          ariaLabel="Text style"
          testId="presentation-panel-text-style"
        />
      </PanelSection>
      <p className="mt-4 text-xs text-[#9a9a9a]" data-testid="presentation-panel-window-label">
        {windowLabel}
      </p>
      {!readOnly && (
        <PanelDeleteButton
          label="Delete text block"
          onClick={onDelete}
          testId="presentation-panel-delete-text-button"
        />
      )}
    </div>
  );
}
