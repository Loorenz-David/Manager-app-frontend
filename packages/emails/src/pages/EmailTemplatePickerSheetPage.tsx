import { useEffect, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { cn } from "@beyo/lib";
import { ContentCard, FieldLabelRow } from "@beyo/ui";

import { useEmailTemplatesQuery } from "../api/use-email-templates-query";
import type { EmailTemplate } from "../types";
import type { EmailTemplatePickerSheetSurfaceProps } from "../surface-ids";

const LAST_TEMPLATE_KEY = "beyo_email_template_last_name";
const EMAIL_TEMPLATE_PICKER_SHEET_HEIGHT = 500;

export function EmailTemplatePickerSheetPage(): React.JSX.Element {
  const { onSelect, selectedTemplateClientId } =
    useSurfaceProps<EmailTemplatePickerSheetSurfaceProps>();
  const header = useSurfaceHeader();
  const templatesQuery = useEmailTemplatesQuery();
  const [view, setView] = useState<"list" | "preview">("list");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(
    null,
  );

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  function handlePreview(template: EmailTemplate): void {
    setPreviewTemplate(template);
    setView("preview");
  }

  function handleBack(): void {
    setView("list");
  }

  function handleSelect(template: EmailTemplate): void {
    localStorage.setItem(LAST_TEMPLATE_KEY, template.name);
    onSelect?.(template);
    header?.requestClose();
  }

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-background"
      style={{ height: EMAIL_TEMPLATE_PICKER_SHEET_HEIGHT }}
    >
      <div className="relative flex flex-shrink-0 items-center border-b border-border px-4 pb-3">
        <div className="flex w-full items-start">
          <div className="w-10">
            {view === "preview" ? (
              <button
                aria-label="Back to template list"
                className="flex items-center justify-center rounded-full p-2 text-muted-foreground"
                type="button"
                onClick={handleBack}
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </button>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 px-2 text-center">
            <p className="text-sm font-semibold text-primary">
              {view === "preview" ? "Preview" : "Email Templates"}
            </p>
            {view === "preview" && previewTemplate ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {previewTemplate.name}
              </p>
            ) : null}
          </div>

          <div className="flex w-10 justify-end">
            <button
              aria-label="Close template picker"
              className="flex items-center justify-center rounded-full p-2 text-muted-foreground"
              type="button"
              onClick={() => {
                header?.requestClose();
              }}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 overflow-y-auto transition-transform duration-200 ease-out",
            view === "preview" ? "-translate-x-full" : "translate-x-0",
          )}
        >
          <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
            {templatesQuery.isPending ? (
              <ContentCard>
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Loading templates…
                </p>
              </ContentCard>
            ) : templatesQuery.isError ? (
              <ContentCard>
                <div className="flex flex-col gap-3 px-4 py-6">
                  <p className="text-sm text-muted-foreground">
                    Templates could not be loaded.
                  </p>
                  <button
                    className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                    type="button"
                    onClick={() => {
                      void templatesQuery.refetch();
                    }}
                  >
                    Try again
                  </button>
                </div>
              </ContentCard>
            ) : (
              templatesQuery.data?.map((template) => (
                <div
                  key={template.client_id}
                  className={cn(
                    "overflow-hidden rounded-2xl transition",
                    template.client_id === selectedTemplateClientId
                      ? "ring-2 ring-primary"
                      : null,
                  )}
                >
                  <ContentCard paddingClassName="p-0">
                    <div className="flex items-stretch">
                      <button
                        className="min-w-0 flex-1 px-4 py-4 text-left"
                        type="button"
                        onClick={() => {
                          handlePreview(template);
                        }}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {template.name}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {template.subject}
                        </p>
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                          {template.text_body}
                        </p>
                      </button>
                      <button
                        aria-label={`Use ${template.name}`}
                        className={cn(
                          "flex w-14 shrink-0 items-center justify-center border-l border-border",
                          template.client_id === selectedTemplateClientId
                            ? "bg-primary text-card"
                            : "text-muted-foreground",
                        )}
                        type="button"
                        onClick={() => {
                          handleSelect(template);
                        }}
                      >
                        <Check aria-hidden="true" className="size-5" />
                      </button>
                    </div>
                  </ContentCard>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 overflow-y-auto transition-transform duration-200 ease-out",
            view === "preview" ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="px-4 pb-4 pt-3">
            <ContentCard paddingClassName="p-0">
              {previewTemplate ? (
                <div className="flex flex-col gap-4 px-4 py-4">
                  <div>
                    <FieldLabelRow label="Subject" />
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {previewTemplate.subject}
                    </p>
                  </div>

                  <div>
                    <FieldLabelRow label="Body" />
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {previewTemplate.text_body}
                    </p>
                  </div>

                  <button
                    className="rounded-2xl bg-(--color-primary) px-4 py-3 text-sm font-semibold text-white shadow-sm"
                    type="button"
                    onClick={() => {
                      handleSelect(previewTemplate);
                    }}
                  >
                    Use template
                  </button>
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Select a template to preview it.
                </p>
              )}
            </ContentCard>
          </div>
        </div>
      </div>
    </div>
  );
}
