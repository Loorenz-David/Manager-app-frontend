export type {
  EmailInboxAdapter,
  EmailInboxFetchParams,
  EmailInboxFetchResult,
  EmailInboxThreadVM,
  EmailMessageDirection,
  EmailMessageVM,
  EmailSwipeAction,
  EmailTemplate,
  EmailThreadHeaderAction,
  EmailThreadMessagesFetchParams,
  EmailThreadMessagesFetchResult,
} from "./types";
export { getEmailTemplates } from "./api/get-email-templates";
export { emailTemplateKeys } from "./api/email-template-keys";
export { useEmailTemplatesQuery } from "./api/use-email-templates-query";
export {
  EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID,
  EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  EmailMessageDetailsSheetSurfaceProps,
  EmailTemplatePickerSheetSurfaceProps,
  EmailsSurfaceOpeners,
} from "./surface-ids";
export { EmailAvatar } from "./components/EmailAvatar";
export { EmailTemplatePicker } from "./components/EmailTemplatePicker";
export type { EmailTemplatePickerProps } from "./components/EmailTemplatePicker";
export { EmailComposer } from "./components/EmailComposer";
export type { EmailComposerProps } from "./components/EmailComposer";
export { EmailInboxHeader } from "./components/EmailInboxHeader";
export { EmailInboxThreadCard } from "./components/EmailInboxThreadCard";
export { EmailInboxView } from "./components/EmailInboxView";
export { EmailThreadCarousel } from "./components/EmailThreadCarousel";
export { EmailThreadHeader } from "./components/EmailThreadHeader";
export { EmailThreadView } from "./components/EmailThreadView";
export { EmailThreadFooter } from "./components/EmailThreadFooter";
export { EmailMessageCard } from "./components/EmailMessageCard";
export { resolveReplySubject } from "./lib/resolve-reply-subject";

export function loadEmailTemplatePickerSheetPage() {
  return import("./pages/EmailTemplatePickerSheetPage").then((m) => ({
    default: m.EmailTemplatePickerSheetPage,
  }));
}

export function loadEmailMessageDetailsSheetPage() {
  return import("./pages/EmailMessageDetailsSheetPage").then((m) => ({
    default: m.EmailMessageDetailsSheetPage,
  }));
}
