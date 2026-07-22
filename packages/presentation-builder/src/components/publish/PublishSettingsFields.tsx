import { PanelFieldLabel, SegmentedControl } from "../panels/PanelPrimitives";

export type PublishCategoryChoice = "none" | "improvement" | "workflow" | "news" | "alert";
export type PublishTypeChoice = "slide_page" | "modal" | "full_screen";

const CATEGORY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "improvement", label: "Improvement" },
  { value: "workflow", label: "Workflow" },
  { value: "news", label: "News" },
  { value: "alert", label: "Alert" },
] as const;

const TYPE_OPTIONS = [
  { value: "slide_page", label: "Slide page" },
  { value: "modal", label: "Modal" },
  { value: "full_screen", label: "Full screen" },
] as const;

type PublishSettingsFieldsProps = {
  category: PublishCategoryChoice;
  onCategoryChange: (value: PublishCategoryChoice) => void;
  presentationType: PublishTypeChoice;
  onPresentationTypeChange: (value: PublishTypeChoice) => void;
  isDismissible: boolean;
  onDismissibleChange: (value: boolean) => void;
  /** Text value so the logic layer owns parsing; "" = derived default. */
  priorityValue: string;
  onPriorityChange: (value: string) => void;
  /** e.g. "Default from category: 100". */
  priorityHint: string;
  disabled?: boolean;
};

/** Category / type / dismissibility / priority block of the publish dialog. */
export function PublishSettingsFields({
  category,
  onCategoryChange,
  presentationType,
  onPresentationTypeChange,
  isDismissible,
  onDismissibleChange,
  priorityValue,
  onPriorityChange,
  priorityHint,
  disabled,
}: PublishSettingsFieldsProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <PanelFieldLabel>Category</PanelFieldLabel>
        <SegmentedControl
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={onCategoryChange}
          disabled={disabled}
          ariaLabel="Category"
          testId="presentation-publish-category"
        />
      </div>
      <div>
        <PanelFieldLabel>Shown as</PanelFieldLabel>
        <SegmentedControl
          options={TYPE_OPTIONS}
          value={presentationType}
          onChange={onPresentationTypeChange}
          disabled={disabled}
          ariaLabel="Presentation type"
          testId="presentation-publish-type"
        />
      </div>
      <div className="flex items-start justify-between gap-4">
        <label className="flex items-center gap-2 text-[13px] font-semibold text-[#303030]">
          <input
            type="checkbox"
            checked={isDismissible}
            disabled={disabled}
            onChange={(event) => onDismissibleChange(event.target.checked)}
            data-testid="presentation-publish-dismissible-checkbox"
            className="size-4 accent-[#303030]"
          />
          Users can dismiss
        </label>
        <div className="w-[140px]">
          <PanelFieldLabel>Priority</PanelFieldLabel>
          <input
            type="text"
            inputMode="numeric"
            value={priorityValue}
            disabled={disabled}
            onChange={(event) => onPriorityChange(event.target.value)}
            placeholder="auto"
            aria-label="Display priority"
            data-testid="presentation-publish-priority-input"
            className="h-9 w-full rounded-lg border border-[#dcdcdc] bg-white px-2.5 text-[13px] text-[#303030] placeholder:text-[#9a9a9a] focus:border-[#3f78a8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-1 text-[11px] text-[#9a9a9a]">{priorityHint}</p>
        </div>
      </div>
    </div>
  );
}
