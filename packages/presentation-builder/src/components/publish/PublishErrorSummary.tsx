import { CircleAlert } from "lucide-react";

type PublishErrorSummaryProps = {
  /** Mapped publish 422 causes (already human-readable), most important first. */
  errors: string[];
};

/** The dialog's general error region — publish validation causes, never a bare toast. */
export function PublishErrorSummary({
  errors,
}: PublishErrorSummaryProps): React.JSX.Element {
  return (
    <div className="flex gap-2" data-testid="presentation-publish-error-summary">
      <CircleAlert aria-hidden className="mt-px size-4 shrink-0 text-[#a9791b]" strokeWidth={2} />
      <ul className="space-y-0.5 text-xs leading-4 text-[#8a5a00]">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
