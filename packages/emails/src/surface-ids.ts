import type { EmailTemplate } from "./types";

export const EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID =
  "email-template-picker-sheet";
export const EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID =
  "email-message-details-sheet";

export type EmailTemplatePickerSheetSurfaceProps = {
  onSelect: (template: EmailTemplate) => void;
  selectedTemplateClientId?: string | null;
};

export type EmailsSurfaceOpeners = {
  openEmailTemplatePicker?: (
    props: EmailTemplatePickerSheetSurfaceProps,
  ) => void;
};

export type EmailMessageDetailsSheetSurfaceProps = {
  fromName: string | null;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  sentOrReceivedAtIso: string | null;
};
