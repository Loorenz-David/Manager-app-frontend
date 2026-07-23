import {
  AlignmentPicker,
  ColorSwatchPicker,
  SliderFieldRow,
  type TextAlignmentChoice,
} from "@beyo/ui";

import { PanelFieldLabel, PanelSection } from "./PanelPrimitives";

export type TextStylingSectionProps = {
  align: TextAlignmentChoice;
  textColor?: string;
  backgroundColor?: string;
  borderRadius: number;
  padding: number;
  onAlignChange: (value: TextAlignmentChoice) => void;
  onTextColorChange: (value: string) => void;
  onBackgroundColorChange: (value: string | undefined) => void;
  onBorderRadiusChange: (value: number) => void;
  onPaddingChange: (value: number) => void;
  readOnly?: boolean;
};

export function TextStylingSection({
  align,
  textColor,
  backgroundColor,
  borderRadius,
  padding,
  onAlignChange,
  onTextColorChange,
  onBackgroundColorChange,
  onBorderRadiusChange,
  onPaddingChange,
  readOnly,
}: TextStylingSectionProps): React.JSX.Element {
  return (
    <PanelSection>
      <div data-testid="presentation-panel-text-styling" className="space-y-4">
        <div>
          <PanelFieldLabel>Alignment</PanelFieldLabel>
          <AlignmentPicker
            value={align}
            onChange={onAlignChange}
            disabled={readOnly}
            testId="presentation-panel-text-alignment"
          />
        </div>
        <div>
          <PanelFieldLabel>Text color</PanelFieldLabel>
          <ColorSwatchPicker
            value={textColor}
            onChange={(value) => {
              if (value !== undefined) onTextColorChange(value);
            }}
            disabled={readOnly}
            ariaLabel="Text color"
            testId="presentation-panel-text-color"
          />
        </div>
        <div>
          <PanelFieldLabel>Background</PanelFieldLabel>
          <ColorSwatchPicker
            value={backgroundColor}
            onChange={onBackgroundColorChange}
            allowNone
            disabled={readOnly}
            ariaLabel="Text background color"
            testId="presentation-panel-text-background"
          />
        </div>
        <SliderFieldRow
          label="Corner radius"
          value={borderRadius}
          min={0}
          max={48}
          valueLabel={`${borderRadius}px`}
          onChange={onBorderRadiusChange}
          disabled={readOnly}
          testId="presentation-panel-text-radius"
        />
        <SliderFieldRow
          label="Padding"
          value={padding}
          min={0}
          max={48}
          valueLabel={`${padding}px`}
          onChange={onPaddingChange}
          disabled={readOnly}
          testId="presentation-panel-text-padding"
        />
      </div>
    </PanelSection>
  );
}
