import type { CSSProperties } from "react";

import { cn } from "../utils";
import type {
  RichTextContent,
  RichTextInlinePart,
  RichTextInlinePartMarks,
} from "./backend-rich-text";

export type RichTextContentViewClassNames = {
  mention?: string;
  label?: string;
  link?: string;
};

type RichTextContentViewProps = {
  content: RichTextContent;
  enableAnimations?: boolean;
  classNames?: RichTextContentViewClassNames;
};

function getAnimationClassName(
  marks: RichTextInlinePartMarks | undefined,
  enableAnimations: boolean,
): string | undefined {
  if (!enableAnimations) return undefined;
  if (marks?.animation === "shake") return "rich-text-animation-shake";
  if (marks?.animation === "pulse") return "rich-text-animation-pulse";
  return undefined;
}

function getTextClassName(
  marks: RichTextInlinePartMarks | undefined,
  enableAnimations: boolean,
): string {
  return cn(
    marks?.bold && "font-semibold",
    marks?.underline && "underline underline-offset-2",
    getAnimationClassName(marks, enableAnimations),
  );
}

function getTextStyle(
  marks: RichTextInlinePartMarks | undefined,
): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (marks?.color) style.color = marks.color;
  if (marks?.size === "small") style.fontSize = "0.85em";
  if (marks?.size === "large") style.fontSize = "1.2em";
  return Object.keys(style).length > 0 ? style : undefined;
}

function renderInlinePart(
  part: RichTextInlinePart,
  index: number,
  enableAnimations: boolean,
  classNames: RichTextContentViewClassNames,
): React.JSX.Element {
  const key = `${part.kind}-${index}`;
  const commonProps = {
    className: getTextClassName(part.marks, enableAnimations),
    "data-animation": part.marks?.animation,
    style: getTextStyle(part.marks),
  };

  if (part.kind === "mention") {
    return (
      <span
        key={key}
        {...commonProps}
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 align-baseline text-[0.95em] font-medium",
          classNames.mention ?? "bg-muted text-foreground",
          commonProps.className,
        )}
      >
        {part.text}
      </span>
    );
  }

  if (part.kind === "label") {
    return (
      <span
        key={key}
        {...commonProps}
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 align-baseline text-[0.8em] font-semibold uppercase tracking-[0.08em]",
          classNames.label ?? "border-border bg-muted/70 text-foreground",
          commonProps.className,
        )}
      >
        {part.text || part.value}
      </span>
    );
  }

  if (part.kind === "link") {
    return (
      <a
        key={key}
        {...commonProps}
        className={cn(
          "underline decoration-current underline-offset-2",
          classNames.link ?? "text-primary",
          commonProps.className,
        )}
        href={part.href}
        rel="noreferrer"
        target="_blank"
      >
        {part.text || part.href}
      </a>
    );
  }

  return (
    <span key={key} {...commonProps}>
      {part.text}
    </span>
  );
}

export function RichTextContentView({
  content,
  enableAnimations = false,
  classNames = {},
}: RichTextContentViewProps): React.JSX.Element {
  return (
    <>
      {content.parts.map((part, index) =>
        renderInlinePart(part, index, enableAnimations, classNames),
      )}
    </>
  );
}
