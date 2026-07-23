export type TextMeasurementInput = {
  content: string;
  fontSizePx: number;
  fontWeight: 400 | 700;
  maxWidthPx?: number;
  paddingPx?: number;
};

export type TextMeasurement = { widthPx: number; heightPx: number };
export type TextMeasurementAdapter = (input: TextMeasurementInput) => TextMeasurement;

const APPROXIMATE_CHARACTER_WIDTH_FACTOR = 0.58;
const TEXT_LINE_HEIGHT = 1.2;

function approximateTextMeasurement({
  content,
  fontSizePx,
  maxWidthPx,
  paddingPx = 0,
}: TextMeasurementInput): TextMeasurement {
  const lines = content.split("\n");
  const availableWidth = maxWidthPx === undefined
    ? undefined
    : Math.max(1, maxWidthPx - paddingPx * 2);
  const approximateLineWidths = lines.map((line) =>
    Math.max(fontSizePx, line.length * fontSizePx * APPROXIMATE_CHARACTER_WIDTH_FACTOR));
  const visualLineCount = approximateLineWidths.reduce(
    (count, width) => count + (
      availableWidth === undefined ? 1 : Math.max(1, Math.ceil(width / availableWidth))
    ),
    0,
  );
  const contentWidth = Math.max(fontSizePx, ...approximateLineWidths);

  return {
    widthPx: (
      availableWidth === undefined
        ? contentWidth
        : Math.min(availableWidth, contentWidth)
    ) + paddingPx * 2,
    heightPx: Math.max(1, visualLineCount) * fontSizePx * TEXT_LINE_HEIGHT + paddingPx * 2,
  };
}

export const measureText: TextMeasurementAdapter = (input) => {
  const {
    content,
    fontSizePx,
    fontWeight,
    maxWidthPx,
    paddingPx = 0,
  } = input;
  if (typeof document !== "undefined") {
    const node = document.createElement("span");
    node.style.cssText = [
      "box-sizing:border-box",
      "position:absolute",
      "visibility:hidden",
      `white-space:${maxWidthPx === undefined ? "pre" : "pre-wrap"}`,
      `font-size:${fontSizePx}px`,
      `font-weight:${fontWeight}`,
      `line-height:${TEXT_LINE_HEIGHT}`,
      `padding:${paddingPx}px`,
      ...(maxWidthPx === undefined ? [] : [`width:${maxWidthPx}px`]),
    ].join(";");
    node.textContent = content;
    document.body.appendChild(node);
    const rect = node.getBoundingClientRect();
    node.remove();
    if (rect.width > 0 && rect.height > 0) {
      return { widthPx: rect.width, heightPx: rect.height };
    }
  }
  return approximateTextMeasurement(input);
};
