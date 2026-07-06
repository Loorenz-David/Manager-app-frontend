import { ChevronRight } from "lucide-react";
import { cn } from "@beyo/lib";
import type { EmailsSurfaceOpeners } from "../surface-ids";
import type { EmailTemplate } from "../types";

export type EmailTemplatePickerProps = {
  selectedTemplate: EmailTemplate | null;
  onSelectTemplate: (template: EmailTemplate) => void;
  surfaceOpeners?: EmailsSurfaceOpeners;
  disabled?: boolean;
  placeholder?: string;
};

export function EmailTemplatePicker({
  selectedTemplate,
  onSelectTemplate,
  surfaceOpeners,
  disabled = false,
  placeholder = "Select an email template",
}: EmailTemplatePickerProps): React.JSX.Element {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition",
        disabled ? "cursor-not-allowed opacity-50" : null,
      )}
      disabled={disabled}
      type="button"
      onClick={() => {
        surfaceOpeners?.openEmailTemplatePicker?.({
          onSelect: onSelectTemplate,
          selectedTemplateClientId: selectedTemplate?.client_id ?? null,
        });
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {selectedTemplate?.name ?? placeholder}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {selectedTemplate?.subject ?? "Choose a template to prefill the email."}
        </p>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}
